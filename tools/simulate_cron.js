const { createClient } = require('@supabase/supabase-js');
const algoliasearch = require('algoliasearch');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

const client = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = client.initIndex(ALGOLIA_CONFIG.indexName);

function log(msg) {
    console.log(`[LOG] ${new Date().toISOString()} - ${msg}`);
}

async function simulate() {
    log('🚀 Starting Simulation...');

    // 1. Fetch IDs
    let allIds = [];
    let page = 0;
    const DB_PAGE_SIZE = 1000;

    log('Fetching IDs from Supabase...');
    while (true) {
        const { data: products, error } = await supabase
            .from('products')
            .select('id')
            .range(page * DB_PAGE_SIZE, (page + 1) * DB_PAGE_SIZE - 1);

        if (error) {
            log(`❌ DB Error: ${error.message}`);
            return;
        }

        if (!products || products.length === 0) break;
        allIds.push(...products.map(p => p.id));
        log(`Page ${page}: Fetched ${products.length} IDs`);

        if (products.length < DB_PAGE_SIZE) break;
        page++;
    }

    log(`Total IDs loaded: ${allIds.length}`);

    // 2. Batch Process
    const BATCH_SIZE = 1000;
    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        const batchIds = allIds.slice(i, i + BATCH_SIZE).map(String);
        log(`\nProcessing Batch ${i} (${batchIds.length} IDs)...`);

        try {
            // A. Get Objects
            log(`Querying Algolia for ${batchIds.length} IDs...`);
            const algoliaResponse = await index.getObjects(batchIds, {
                attributesToRetrieve: ['sales', 'stores_with_stock']
            });

            // Handle structure
            const hits = algoliaResponse.results || algoliaResponse.objects || [];
            log(`Algolia returned ${hits.length} hits`);

            const validHits = hits.filter(h => h !== null);
            log(`Valid hits: ${validHits.length}`);

            // B. Transform
            const snapshots = validHits.map(p => ({
                product_id: p.objectID,
                sales_count: p.sales || 0,
                stores_count: p.stores_with_stock ? p.stores_with_stock.length : 0,
                hour_bucket: new Date().toISOString(), // Mock
                recorded_at: new Date().toISOString()
            }));

            // C. Insert (Mock)
            log(`Would insert ${snapshots.length} records...`);
            const { error: upsertError } = await supabase
                .from('hourly_sales')
                .upsert(snapshots, {
                    onConflict: 'product_id,hour_bucket'
                });

            if (upsertError) {
                log(`❌ Upsert Error: ${upsertError.message}`);
            } else {
                log(`✅ Upsert Success`);
            }

        } catch (e) {
            log(`❌ CRITICAL BATCH ERROR: ${e.message}`);
            console.error(e);
        }
    }
}

simulate();
