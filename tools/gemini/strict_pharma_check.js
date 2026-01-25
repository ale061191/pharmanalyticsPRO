const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Configuration
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 1000;
const MODEL_NAME = 'gemini-1.5-pro-latest';

const API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json",
    }
});

async function main() {
    console.log('🚀 Starting STRICT Pharma Classification Check...');

    // 1. Fetch ONLY products currently marked as is_pharma = true
    // We assume is_pharma = false are already safe or don't matter for this strict check.
    // Actually, user wants to PURGE non-pharma from the view.
    let { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_pharma', true);

    console.log(`📦 Analyzing ${count} products currently marked as PHARMA...`);

    const limit = count;
    let offset = 0;

    while (offset < limit) {
        // Fetch batch
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, clean_name, active_ingredient')
            .eq('is_pharma', true)
            .range(offset, offset + BATCH_SIZE - 1);

        if (error) {
            console.error('❌ Error fetching products:', error);
            break;
        }

        if (!products || products.length === 0) break;

        console.log(`\n🔄 Processing batch ${offset} - ${offset + products.length}...`);

        try {
            const classifiedData = await classifyWithGemini(products);

            // Update DB for items that are NOT pharma
            for (const item of classifiedData) {
                if (item.is_pharma === false) {
                    console.log(`🚫 PURGING (Marking Non-Pharma): ${item.name} (${item.reason})`);

                    const { error: updateError } = await supabase
                        .from('products')
                        .update({ is_pharma: false })
                        .eq('id', item.id);

                    if (updateError) {
                        console.error(`❌ Failed to update ${item.id}:`, updateError);
                    }
                }
            }
        } catch (err) {
            console.error('❌ Batch error:', err);
        }

        offset += BATCH_SIZE;
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
}

async function classifyWithGemini(batch) {
    const prompt = `
    You are a STRICT pharmaceutical classifier.
    Your specific task: Identify items that are NOT pharmaceutical drugs.
    
    DEFINITIONS:
    - PHARMA (true): Drugs, medicines, pills, syrups, injections, active pharmaceutical ingredients.
    - NON-PHARMA (false): Food (chocolate, cookies, formula milk, supplements requiring no prescription, tea), Cosmetics (shampoo, soap, makeup, sunscreen unless medicated), Equipment (yoga mats, wheelchairs, needles, gauze), Miscellaneous (diapers, wipes).

    STRICT RULES:
    1. "Tapete de Yoga" -> NON-PHARMA
    2. "Chocolate" -> NON-PHARMA
    3. "Galletas" -> NON-PHARMA
    4. "Formula Infantil" (e.g., Enfamil) -> NON-PHARMA (Nutritional, not drug) -> User said "solo farmacos", usually formula implies food. Wait, user said "chocolate y esas cosas". I will treat Food/Supplements as False unless it's a Vitamin complex prescribed as a drug.
    5. Be aggressive in removing non-drugs.
    
    INPUT DATA:
    ${JSON.stringify(batch)}

    OUTPUT FORMAT:
    Return a raw JSON ARRAY used for decision making.
    [{ "id": "...", "name": "...", "is_pharma": boolean, "reason": "short string" }]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
}

main();
