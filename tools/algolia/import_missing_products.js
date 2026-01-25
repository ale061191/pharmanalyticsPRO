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
const BATCH_SIZE = 1000;

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
    console.log('🚀 Starting Gap Analysis & Missing Product Import via Search...');

    // 1. Fetch Local Product Identifiers (for fast lookup)
    console.log('📥 Fetching local catalog IDs/Barcodes...');
    const { data: localProducts, error } = await supabase
        .from('products')
        .select('id, barcode, name');

    if (error) throw error;

    const localSet = new Set();
    const localBarcodes = new Set();
    localProducts.forEach(p => {
        if (p.id) localSet.add(String(p.id));
        if (p.barcode) localBarcodes.add(String(p.barcode));
    });
    console.log(`✅ Loaded ${localSet.size} local identifiers.`);

    // 2. Fetch Farmatodo Catalog (Algorithm: Search '' to get top hits)
    console.log('🌍 Browsing Farmatodo Catalog via Search (limited depth)...');
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    const index = client.initIndex(ALGOLIA_INDEX);

    let hits = [];
    const HITS_PER_PAGE = 200; // Large page
    const MAX_PAGES = 5; // Fetch top 1000 products for now

    try {
        for (let page = 0; page < MAX_PAGES; page++) {
            const res = await index.search('', {
                page: page,
                hitsPerPage: HITS_PER_PAGE,
                attributesToRetrieve: ['objectID', 'id', 'name', 'description', 'brand', 'mediaImageUrl', 'price', 'barcode', 'categories']
            });

            if (res.hits.length === 0) break;
            hits = hits.concat(res.hits);
            process.stdout.write(`\rFetched page ${page + 1}/${MAX_PAGES}... (Total: ${hits.length})`);
        }

    } catch (e) {
        console.error('\nSearch error:', e);
        return;
    }
    console.log(`\n✅ Fetched ${hits.length} top products from Farmatodo Vzla.`);

    // 3. Identify Missing Items
    const missingItems = hits.filter(h => {
        const id = String(h.id || h.objectID);
        const bar = h.barcode ? String(h.barcode) : null;

        // Exact ID match OR Barcode match
        const exists = localSet.has(id) || (bar && localBarcodes.has(bar));
        return !exists;
    });

    console.log(`🔍 Found ${missingItems.length} POTENTIAL missing products (Gap).`);

    if (missingItems.length === 0) {
        console.log('🎉 No missing products found in this sample.');
        return;
    }

    // 4. Process & Clean & Validation (Batch)
    const candidates = missingItems.slice(0, 50); // Validating first 50

    console.log(`🧪 Importing first ${candidates.length} candidates with AI Cleaning...`);

    const cleanedBatch = await cleanAndClassify(candidates);

    // 5. Insert Valid Pharma Only
    const toInsert = cleanedBatch.filter(p => p.is_pharma === true);

    console.log(`📦 Inserting ${toInsert.length} NEW VALID PHARMA products to DB...`);

    if (toInsert.length > 0) {
        // Need to remove 'classification' property if it's not in DB schema, 
        // but log confirmed 'classification' exists in DB schema (step 552 output).
        // 'active_ingredient_standardized' also exists.

        const { error: insertError } = await supabase.from('products').insert(toInsert);
        if (insertError) {
            console.error('Insert Error:', insertError);
            // Retry individually to isolate bad row? No, just log for now.
        } else {
            console.log('✅ Import Successful!');
            toInsert.forEach(p => console.log(`   + Added: ${p.clean_name} (${p.laboratory})`));
        }
    } else {
        console.log('⚠️ No new pharma products identified in this batch (all were junk or invalid).');
    }
}

async function cleanAndClassify(rawItems) {
    const prompt = `
    Analyze these raw products from a Venezuelan pharmacy feed.
    Task 1: CLEAN the name (remove presentation details).
    Task 2: EXTRACT metadata (active ingredient, etc).
    Task 3: CLASSIFY strictly as Pharma (drug) or Non-Pharma (food, equipment, etc).

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
        "classification": "General Category (e.g. Analgesico)"
    }]
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("Gemini Error:", e);
        return [];
    }
}

main();
