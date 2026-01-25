const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must be Service Role to write

const BATCH_SIZE = 20; // Conservative batch size for AI
// ---------------------

async function main() {
    if (!API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Missing ENV variables (GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }); // Fast & Smart

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('📦 Fetching products from Supabase...');
    // Fetch products that haven't been "AI Cleaned" yet (or all if we want to force update)
    // For this recovery operation, user wants EVERYTHING perfect.
    // Let's fetch all 5000.

    // Pagination to fetch all
    let allProducts = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, brand, original_price') // Fetch fields useful for context
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;

        allProducts.push(...data);
        page++;
    }

    console.log(`🚀 Processing ${allProducts.length} products with Gemini...`);

    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
        const batch = allProducts.slice(i, i + BATCH_SIZE);
        console.log(`\n🔄 Processing Batch ${i} - ${i + batch.length}...`);

        try {
            const enrichedBatch = await enrichBatch(model, batch);

            // Upsert results back to Supabase
            if (enrichedBatch.length > 0) {
                const { error } = await supabase.from('products').upsert(enrichedBatch, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });
                if (error) console.error('Error upserting batch:', error.message);
                else console.log(`✅ Saved ${enrichedBatch.length} enriched products.`);
            }

            // Rate limit
            await new Promise(r => setTimeout(r, 1500));

        } catch (error) {
            console.error(`❌ Batch Error:`, error.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    console.log('\n✨ All Done!');
}

async function enrichBatch(model, batch) {
    const prompt = `
    You are a Pharmaceutical Data Expert.
    Enrich and Clean the following list of medicines from Venezuela.

    Input JSON:
    ${JSON.stringify(batch.map(p => ({ id: p.id, raw_name: p.name, brand_hint: p.brand })))}

    For each item, infer/extract and return a JSON object with:
    - "id": (Keep original)
    - "clean_name": The perfect Commercial Name (Title Case, no dosage/presentation). e.g. "Atamel", "Losartán Genfar".
    - "active_ingredient": Molecular Principle (e.g. "Acetaminofén").
    - "presentation": Dosage and Form (e.g. "Tabletas 500mg", "Jarabe 120ml").
    - "brand": The Laboratory or Brand Name (e.g. "Calox", "Genfar", "Bayer").
    - "atc_code": The inferred WHO ATC Code (Level 4 or 5) e.g. "N02BE01". If unknown/generic, make a best guess or use "N02".

    CRITICAL: Return ONLY a raw JSON Array. No markdown.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("AI Error:", e.message);
        return [];
    }
}

main();
