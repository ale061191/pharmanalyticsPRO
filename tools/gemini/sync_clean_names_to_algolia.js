const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const algoliasearch = require('algoliasearch');

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must be Service Role to read/write DB
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID_VEN;
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY_VEN; // Hopefully valid for write
const INDEX_NAME = 'products-venezuela';
const BATCH_SIZE = 500;
// ---------------------

async function main() {
    if (!SUPABASE_URL || !SUPABASE_KEY || !ALGOLIA_APP_ID || !ALGOLIA_API_KEY) {
        console.error('❌ Missing ENV variables.');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    const index = client.initIndex(INDEX_NAME);

    console.log('📦 Fetching enriched products from Supabase...');

    let allProducts = [];
    let page = 0;
    const PAGE_SIZE = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('products')
            .select('id, clean_name')
            .not('clean_name', 'is', null) // Only valid clean names
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) { console.error("DB Error:", error); break; }
        if (!data || data.length === 0) break;

        allProducts.push(...data);
        page++;
        // console.log(`Fetched page ${page}, total so far: ${allProducts.length}`);
    }

    console.log(`🚀 Syncing ${allProducts.length} clean names to Algolia...`);

    // Batch update
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
        const batch = allProducts.slice(i, i + BATCH_SIZE);

        // Prepare Algolia objects
        // We update 'description' to be the clean name, and also 'clean_name' attribute
        const algoliaObjects = batch.map(p => ({
            objectID: p.id,
            description: p.clean_name, // Override display name
            clean_name: p.clean_name,   // Store specifically
            mediaDescription: p.clean_name // Common display field fallback
        }));

        try {
            await index.partialUpdateObjects(algoliaObjects, { createIfNotExists: false });
            updatedCount += batch.length;
            process.stdout.write(`\r✅ Progress: ${updatedCount} / ${allProducts.length}`);
        } catch (error) {
            console.error(`\n❌ Batch Error (Index ${i}):`, error.message);
            errorCount += batch.length;
            if (error.message.includes('403')) {
                console.error("⛔ FATAL: The Algolia API Key provided does not have WRITE permissions.");
                process.exit(1);
            }
        }
    }

    console.log(`\n\n✨ Sync Complete!`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`❌ Failed: ${errorCount}`);
}

main();
