const algoliasearch = require('algoliasearch');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// CONFIG
const ALGOLIA_APP_ID = "VCOJEYD2PO";
const ALGOLIA_API_KEY = "869a91e98550dd668b8b1dc04bca9011";
const ALGOLIA_INDEX = "products";

// TARGET ITERATION KEYS (To bypass 1000 item limit)
// We use broad keywords that cover all pharma sectors
const ITERATION_KEYS = [
    "Antibiotico", "Analgesico", "Antiinflamatorio", "Antialergico", "Antigripal",
    "Jarabe", "Tabletas", "Capsulas", "Gotas", "Ampolla", "Inyeccion", "Solucion",
    "Pediatrico", "Adulto", "Crema", "Unguento", "Gel", "Locion",
    "Cardiologia", "Diabetes", "Hipertension", "Colesterol",
    "Gastrico", "Digestivo", "Antiacido", "Laxante",
    "Vitamina", "Suplemento", "Mineral",
    "Oftalmico", "Otico", "Nasal", "Topico",
    "Ginecologia", "Urologia", "Dermatologia",
    "Psiquiatria", "Neurologia", "Convulsiones"
];

// SUPABASE
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GEMINI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
});

async function main() {
    console.log('🚀 Starting Deep Pharma Harvest (Comprehensive Import) V2...');

    // 1. Load Local State (ID Set)
    console.log('📥 Loading local database IDs...');
    const { data: localProducts, error } = await supabase.from('products').select('id, barcode');
    if (error) { console.error(error); return; }

    const localSet = new Set();
    const localBarcodes = new Set();
    localProducts.forEach(p => {
        if (p.id) localSet.add(String(p.id).trim());
        if (p.barcode) localBarcodes.add(String(p.barcode).trim());
    });
    console.log(`✅ Loaded ${localSet.size} existing products.`);

    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    const index = client.initIndex(ALGOLIA_INDEX);

    let totalDiscovered = 0;
    let totalImported = 0;

    // 2. Iterate Keywords
    for (const key of ITERATION_KEYS) {
        console.log(`\n🔍 Harnessing '${key}'...`);
        let keyHits = [];

        try {
            // Fetch top 300 for each keyword
            for (let page = 0; page < 4; page++) {
                const res = await index.search(key, {
                    page,
                    hitsPerPage: 100,
                    attributesToRetrieve: ['objectID', 'id', 'name', 'description', 'brand', 'mediaImageUrl', 'price', 'barcode']
                });

                if (res.hits.length === 0) break;
                keyHits = keyHits.concat(res.hits);
            }
        } catch (e) {
            console.error(`Error searching '${key}':`, e.message);
            continue;
        }

        console.log(`   Found ${keyHits.length} matches.`);

        // 3. Filter Missing
        const missing = keyHits.filter(h => {
            const id = String(h.id || h.objectID).trim();
            const bar = h.barcode ? String(h.barcode).trim() : null;
            return !localSet.has(id) && (!bar || !localBarcodes.has(bar));
        });

        if (missing.length === 0) {
            console.log('   All matches already exist.');
            continue;
        }

        console.log(`   🆕 Found ${missing.length} NEW products. Importing...`);
        totalDiscovered += missing.length;

        // 4. Batch Process with AI
        // Process in chunks of 20 (Reduced to avoid token limits/truncation)
        for (let i = 0; i < missing.length; i += 20) {
            const batch = missing.slice(i, i + 20);
            try {
                const processed = await cleanAndClassify(batch);

                // Insert Pharma Only
                const toInsert = processed.filter(p => p.is_pharma === true);

                if (toInsert.length > 0) {
                    const { error: insErr } = await supabase.from('products').insert(toInsert);
                    if (insErr) console.error('   ❌ Insert Error:', insErr.message);
                    else {
                        console.log(`   ✅ Inserted ${toInsert.length} products (Batch ${i}).`);
                        totalImported += toInsert.length;
                        toInsert.forEach(p => localSet.add(String(p.id)));
                    }
                }
            } catch (batchErr) {
                console.error('   ❌ Batch Processing Failed:', batchErr.message);
            }
        }
    }

    console.log(`\n🎉 Deep Harvest Complete! Discovered: ${totalDiscovered}, Imported: ${totalImported}`);
}

async function cleanAndClassify(rawItems) {
    const prompt = `
    Analyze these raw products found in a pharmacy search.
    Task 1: CLEAN the name (remove presentation details).
    Task 2: EXTRACT metadata.
    Task 3: CLASSIFY STRICTLY.
    
    CRITICAL: You are filtering for a PHARMACY database.
    - is_pharma = true: Drugs, Medicines, Pills, Syrups, Injections, Medicated Creams.
    - is_pharma = false: Food, Candy, Cosmetics (non-medicated), Equipment, Diapers, etc.
    
    INPUT:
    ${JSON.stringify(rawItems.map(i => ({
        original_id: i.id || i.objectID,
        name: i.description || i.name,
        image: i.mediaImageUrl,
        barcode: i.barcode,
        brand: i.brand
    })))}

    OUTPUT: JSON Array
    [{
        "id": "original_id",
        "name": "Original Name",
        "clean_name": "Cleaned Name",
        "active_ingredient": "Substance",
        "atc_code": "Code or null",
        "presentation": "Form",
        "concentration": "Strength",
        "brand": "Manufacturer",
        "is_pharma": boolean,
        "image_url": "url",
        "barcode": "code",
        "active_ingredient_standardized": "Substance (cleaned)",
        "classification": "Category"
    }]
    `;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();

        // Robust JSON extraction
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            text = jsonMatch[0];
        } else {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        return JSON.parse(text);
    } catch (e) {
        throw new Error("Gemini AI Parsing Error: " + e.message);
    }
}

main();
