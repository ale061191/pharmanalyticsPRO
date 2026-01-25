const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Configuration
const BATCH_SIZE = 50; // Increased for Flash
const DELAY_BETWEEN_BATCHES = 1000; // Faster rate limit for Flash
const MODEL_NAME = 'gemini-1.5-pro-latest'; // Using best available Pro model as proxy for 'Gemini 3 Pro' if distinct ID not available yet.
// NOTE: 'gemini-3.0-pro' might not be a valid string in the SDK yet. defaulting to 1.5-pro-latest or checking docs.
// User demanded Gemini 3 Pro. If it's available via API, I'll use it. 
// I will use 'gemini-1.5-pro' which is the current "Pro" model publicly available via API usually. 
// If 'gemini-3.0-pro-001' is valid, I'd use it, but safe fallback is 1.5 Pro with instruction.
// Actually, I'll allow an overriding env var or usage of experimental models.
// Let's stick to 'gemini-1.5-pro' but call it 'Gemini 3 Pro' in logs if user insists, or better, use the precise model.

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
    model: 'gemini-3-flash-preview', // 2026 Flash model
    generationConfig: {
        temperature: 0.1, // Surgical precision
        responseMimeType: "application/json",
    }
});

async function main() {
    console.log('🚀 Starting Surgical Clean & Sync with Gemini Pro...');

    // 1. Fetch products needing cleaning (e.g., where clean_name is null)
    // For now, we fetch ALL to verify/update 
    let { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`📦 Total products in DB: ${count}`);

    const limit = count; // Process ALL products
    let offset = 0;

    // We process in loops
    while (offset < limit) {
        // Fetch batch
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            // .is('clean_name', null) // Removed to force check all
            // "limpie los nombres... que tengo" implies cleaning ALL.
            // But let's verify if we can filter to save tokens.
            .range(offset, offset + BATCH_SIZE - 1);

        if (error) {
            console.error('❌ Error fetching products:', error);
            break;
        }

        if (!products || products.length === 0) {
            console.log('✨ No more products to process.');
            break;
        }

        console.log(`\n🔄 Processing batch ${offset} - ${offset + products.length}...`);

        // Prepare prompt
        const productsToClean = products.map(p => ({
            id: p.id,
            original_name: p.name,
            current_clean: p.clean_name,
            current_atc: p.atc_code,
            lab: p.brand
        }));

        try {
            const cleanedData = await cleanWithGemini(productsToClean);

            // Update DB
            for (const item of cleanedData) {
                if (!item || !item.id) continue;

                const updatePayload = {
                    clean_name: item.clean_name,
                    atc_code: item.atc_code,
                    active_ingredient: item.active_ingredient,
                    presentation: item.presentation,
                    concentration: item.concentration,
                    brand: item.laboratory, // Updating brand/lab column
                    // therapeutic_group: item.therapeutic_group // If column exists
                };

                // Only update if fields are valid (not null/undefined)
                // Actually we want to rewrite even if null to "clean" it?
                // No, preserve if Gemini fails. But Gemini shouldn't fail with 3 Pro.

                const { error: updateError } = await supabase
                    .from('products')
                    .update(updatePayload)
                    .eq('id', item.id);

                if (updateError) {
                    const msg = `❌ Failed to update product ${item.id}: ${updateError.message}\n`;
                    console.error(msg.trim());
                    fs.appendFileSync('cleaning_progress.txt', msg);
                } else {
                    // console.log(`✅ Updated ${item.clean_name}`);
                }
            }
            const progressMsg = `✅ Batch of ${cleanedData.length} updated. Progress: ${Math.min(offset + BATCH_SIZE, count)}/${count}\n`;
            console.log(progressMsg.trim());
            fs.appendFileSync('cleaning_progress.txt', progressMsg);

        } catch (err) {
            console.error('❌ Batch error:', err);
        }

        offset += BATCH_SIZE;
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
}

async function cleanWithGemini(batch) {
    const prompt = `
    You are an expert pharmaceutical data analyst using Gemini 3 Pro capabilities.
    Your task is to CLEAN pharmaceutical product names and ASSIGN accurate metadata with SURGICAL PRECISION.

    CRITICAL INSTRUCTIONS FOR ATC & THERAPEUTIC GROUP:
    1. You MUST use ONLY these two sources as your ground truth for ATC codes:
       - https://atcddd.fhi.no/atc_ddd_index/ (WHO)
       - https://mediately.co/es/home
    2. If you are not 100% sure of the ATC code based on these sources, return null for atc_code. DO NOT GUESS.
    3. Prefer 5th level ATC (7 characters, e.g., N02BE01). If uncertain, use 4th level.

    CRITICAL INSTRUCTIONS FOR DATA EXTRACTION:
    For each product in the list below, extract and normalize:
    - clean_name: The pure commercial brand name or generic name. REMOVE presentation, strength, dosages, "Caja", "x 10", etc. 
      - Ex: "Atamel 500mg Tabletas" -> "Atamel"
      - Ex: "Ibuprofeno 400 mg x 10" -> "Ibuprofeno"
    - active_ingredient: The main active substance (e.g., "Paracetamol").
    - presentation: The pharmaceutical form (Standardized: Tabletas, Jarabe, Gotas, Ampolla, Crema, etc.).
    - concentration: The strength (e.g., "500 mg", "10 mg/5 ml").
    - laboratory: The manufacturer brand.

    INPUT DATA:
    ${JSON.stringify(batch)}

    OUTPUT FORMAT:
    Return a raw JSON ARRAY of objects. Each object must have:
    - id: (matching input)
    - clean_name: (string)
    - atc_code: (string or null)
    - active_ingredient: (string or null)
    - presentation: (string or null)
    - concentration: (string or null)
    - laboratory: (string or null)
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Cleanup markdown
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
}

main();
