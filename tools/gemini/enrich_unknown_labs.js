const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Load environment variables for local execution
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Configuration
const BATCH_SIZE = 30; // Reduce batch size to allow more granular retries
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds delay = ~12 requests/minute (safe for 15 RPM limit)
const API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing credentials (GEMINI_API_KEY, SUPABASE_URL, or SUPABASE_KEY)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-pro',
    generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
    }
});

async function main() {
    console.log('🚀 Starting "Unknown" Label Analysis with Gemini AI...');

    // 1. Count targets
    const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .or('brand.eq.Unknown,brand.eq.Desconocido,brand.is.null');

    if (countError) {
        console.error("Error counting products:", countError);
        return;
    }

    console.log(`📦 Found ${count} products with Unknown/Missing brand.`);

    // 2. Fetch and Process in Batches
    // We paginate manually because we are modifying the data as we go, 
    // but the filter criteria (Unknown) might change if we update them! 
    // SAFEST STRATEGY: Fetch IDs first or just use updated offsets? 
    // If we update 'brand', they drop out of the query for the next page if we just re-query.
    // So we can just validly keep querying page 0 until count is 0? 
    // Or simpler: Fetch all IDs first.

    const { data: allIds, error: idError } = await supabase
        .from('products')
        .select('id')
        .or('brand.eq.Unknown,brand.eq.Desconocido,brand.is.null');

    if (idError) throw idError;

    const total = allIds.length;
    let processed = 0;

    while (processed < total) {
        // Take a slice of IDs
        const batchIds = allIds.slice(processed, processed + BATCH_SIZE).map(x => x.id);

        // Fetch full data for these IDs
        const { data: products } = await supabase
            .from('products')
            .select('id, name, clean_name')
            .in('id', batchIds);

        if (!products || products.length === 0) break;

        console.log(`\n🔄 Processing batch ${processed + 1} - ${processed + products.length} / ${total}...`);

        try {
            const updates = await analyzeLabsWithGemini(products);

            // Update DB
            for (const item of updates) {
                if (!item || !item.id || item.laboratory === 'Unknown') continue; // Skip if still unknown

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ brand: item.laboratory }) // Only updating brand
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`❌ Failed to update ${item.id}: ${updateError.message}`);
                } else {
                    // console.log(`✅ Identified: ${item.clean_name} -> ${item.laboratory}`);
                }
            }
            console.log(`✅ Batch synced.`);

        } catch (err) {
            console.error('❌ Batch error:', err);
        }

        processed += BATCH_SIZE;
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }

    console.log("🎉 Analysis Complete.");
}

const MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

async function analyzeLabsWithGemini(batch) {
    const prompt = `
    You are an expert pharmaceutical Data Detective.
    Your task is to identify the LABORATORY (Manufacturer Brand) for a list of products that are currently marked as "Unknown".
    
    DATA SOURCES IN NAME:
    - "Ursocol Laboratorios Zuzu" -> Lab: "Zuzu"
    - "Diclofenac ... Genfar" -> Lab: "Genfar"
    - "Ibuprofeno ... La Sante" -> Lab: "La Sante"
    - "Atamel" -> Lab: "Pfizer"
    - "Acetaminofen (Genven)" -> Lab: "Genven"
    
    INSTRUCTIONS:
    1. Analyze 'name' deeply. Look for:
       - Suffixes: "x 10 Genfar", "x 30 Calox"
       - Prefixes: "Laboratorios Leti ...", "Farma ..."
       - Parentheses: "(Genven)", "(Behrens)"
    2. known_brands_context: [Farmatodo, Genfar, La Sante, Calox, Leti, Behrens, Oftalmi, Siegfried, McK, Vivax, Valmor, Elmor]
    3. IF NO BRAND FOUND:
       - If name is purely generic (e.g. "Acetaminofen 500mg"), return "Genérico".
       - If it looks like a brand but you are unsure, return "Unknown".
    4. Normalize Names: "Laboratorios Zuzu" -> "Zuzu". "Farmatodo Formula..." -> "Farmatodo".

    INPUT DATA:
    ${JSON.stringify(batch)}

    OUTPUT FORMAT (JSON ARRAY):
    [
        { "id": "uuid", "clean_name": "string", "laboratory": "Found Lab Name OR Unknown OR Genérico" }
    ]
    `;

    for (const modelName of MODELS_TO_TRY) {
        try {
            const m = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json" } });
            // console.log(`Attempting with model: ${modelName}`);
            const result = await m.generateContent(prompt);
            const text = result.response.text();
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.warn(`Model ${modelName} failed: ${e.message}`);
            if (e.message.includes('404')) continue; // Try next
            throw e; // Other error
        }
    }
    throw new Error("All models failed.");
}

main();
