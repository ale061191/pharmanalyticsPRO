const { createClient } = require('@supabase/supabase-js');
const algoliasearch = require('algoliasearch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// CONFIG from route.ts
const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// NOTE: Using require instead of import as this is a node script
const client = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = client.initIndex(ALGOLIA_CONFIG.indexName);

function log(msg) {
    console.log(`[LOG] ${new Date().toISOString()} - ${msg}`);
}

async function simulate() {
    log('🚀 Starting Simulation (With Fixes)...');
    const startTime = Date.now();
    const maxDuration = 60; // Simulate 1 minute limit

    // 1. Fetch IDs
    let allIds = [];
    let page = 0;
    const DB_PAGE_SIZE = 1000;

    log('Fetching IDs from Supabase...');
    while (true) {
        const { data: products, error } = await supabase
            .from('products')
            .select('id')
            .order('id', { ascending: true }) // Added Ordering
            .range(page * DB_PAGE_SIZE, (page + 1) * DB_PAGE_SIZE - 1);

        if (error) {
            log(`❌ DB Error: ${error.message}`);
            return;
        }

        if (!products || products.length === 0) break;
        allIds.push(...products.map(p => String(p.id).trim())); // Added Trim
        log(`Page ${page}: Fetched ${products.length} IDs`);

        if (products.length < DB_PAGE_SIZE) break;
        page++;
    }

    log(`Total IDs loaded: ${allIds.length}`);

    // 2. Batch Process
    const BATCH_SIZE = 200; // Reduced Size
    let processed = 0;
    let inserted = 0;
    const recordedAt = new Date().toISOString();
    const hourBucket = new Date().toISOString();

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > (maxDuration - 10) * 1000) {
            log("⚠️ Timeout check triggered!");
            break;
        }

        const batchIds = allIds.slice(i, i + BATCH_SIZE);
        // log(`\nProcessing Batch ${i} (${batchIds.length} IDs)...`);

        try {
            // A. Get Objects
            // log(`Querying Algolia for ${batchIds.length} IDs...`);
            const algoliaResponse = await index.getObjects(batchIds, {
                attributesToRetrieve: ['sales', 'stores_with_stock']
            });

            const hits = algoliaResponse.results || algoliaResponse.objects || [];
            const validHits = hits.filter(h => h !== null);

            // B. Transform
            const snapshots = validHits.map(p => ({
                product_id: p.objectID,
                sales_count: p.sales || 0,
                stores_count: p.stores_with_stock ? p.stores_with_stock.length : 0,
                hour_bucket: hourBucket,
                recorded_at: recordedAt
            }));

            // C. Insert (Mock)
            // log(`Upserting ${snapshots.length}...`);
            // NOTE: Commented out actual INSERT to avoid polluting DB with fake runs, 
            // but we want to test if it crashes.
            // We will do a real select test instead or just log
            inserted += snapshots.length;
            processed += batchIds.length;

            if (i % 1000 === 0) log(`Processed ${processed}, Inserted ${inserted}`);

        } catch (e) {
            log(`❌ CRITICAL BATCH ERROR: ${e.message}`);
            console.error(e);
        }
    }

    log(`✅ Simulation Complete. Processed: ${processed}, Inserted: ${inserted}`);
}

simulate();
