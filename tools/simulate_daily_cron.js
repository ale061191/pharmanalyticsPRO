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

const client = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = client.initIndex(ALGOLIA_CONFIG.indexName);

function log(msg) {
    console.log(`[LOG] ${new Date().toISOString()} - ${msg}`);
}

async function simulate() {
    log('🚀 Starting DAILY Snapshot Simulation...');
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

        if (products.length < DB_PAGE_SIZE) break;
        page++;
    }

    log(`Total IDs loaded: ${allIds.length}`);

    // 2. Batch Process
    const BATCH_SIZE = 200; // Reduced Size
    let processed = 0;
    let inserted = 0;
    const today = new Date().toISOString().split('T')[0];
    const capturedAt = new Date().toISOString();

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > (maxDuration - 10) * 1000) {
            log("⚠️ Timeout check triggered!");
            break;
        }

        const batchIds = allIds.slice(i, i + BATCH_SIZE);

        try {
            // A. Get Objects
            const algoliaResponse = await index.getObjects(batchIds, {
                attributesToRetrieve: ['sales', 'totalStock', 'stores_with_stock'] // Different attrs for daily
            });

            const hits = algoliaResponse.results || algoliaResponse.objects || [];
            const validHits = hits.filter(h => h !== null);

            // B. Transform
            const snapshots = validHits.map(p => ({
                product_id: p.objectID,
                sales_count: p.sales || 0,
                stock_count: p.totalStock || (p.stores_with_stock ? p.stores_with_stock.length : 0),
                snapshot_date: today,
                captured_at: capturedAt
            }));

            // C. Insert (Mock)
            // We will ACTUALLY INSERT this time to verify schema compatibility, 
            // but we'll use a fake date or just rely on dry run?
            // Let's dry run the insert but log success

            // const { error: upsertError } = await supabase.from('sales_snapshot')... 

            inserted += snapshots.length;
            processed += batchIds.length;

            if (i % 1000 === 0) log(`Processed ${processed}, Would Insert ${inserted}`);

        } catch (e) {
            log(`❌ CRITICAL BATCH ERROR: ${e.message}`);
            console.error(e);
        }
    }

    log(`✅ Simulation Complete. Processed: ${processed}, Ready to Insert: ${inserted}`);
}

simulate();
