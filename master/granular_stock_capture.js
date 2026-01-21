/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GRANULAR STOCK CAPTURE - STEALTH MODE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Captures exact stock units per store from Farmatodo's private API.
 * Designed to run once per day at 4:00 AM (off-peak hours).
 * 
 * USAGE:
 *   node granular_stock_capture.js              # Full capture
 *   node granular_stock_capture.js --dry-run    # Preview without DB writes
 *   node granular_stock_capture.js --limit 100  # Capture only first 100 products
 * 
 * CRON (Windows Task Scheduler or Linux cron):
 *   0 4 * * * cd /path/to/pharmanalytics/master && node granular_stock_capture.js
 * 
 * STEALTH FEATURES:
 *   - Randomized delays (300-1500ms)
 *   - Dynamic User-Agent headers
 *   - Smart retries on 429/403
 *   - Batch processing with pauses
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
    farmatodo: {
        token: process.env.FARM_TOKEN,
        tokenIdWebSafe: process.env.FARM_TOKEN_ID,
        key: process.env.FARM_KEY,
        deviceId: process.env.FARM_DEVICE_ID || '33d3f30e-cc88-eb7c-3af7-a18b54e1b145'
    },
    // Stealth settings
    minDelay: 300,
    maxDelay: 1500,
    batchSize: 5, // Concurrent requests (keep low)
    maxRetries: 3,
    // Logging
    logFile: path.join(__dirname, 'granular_stock.log'),
    progressFile: path.join(__dirname, 'granular_progress.json')
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT_ARG = args.indexOf('--limit');
const LIMIT = LIMIT_ARG !== -1 ? parseInt(args[LIMIT_ARG + 1]) : null;

// Validate env
if (!CONFIG.supabase.url || !CONFIG.supabase.key || !CONFIG.farmatodo.token) {
    console.error('❌ Missing Credentials in .env.local');
    process.exit(1);
}

// Initialize clients
const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.key);

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function randomDelay() {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay)) + CONFIG.minDelay;
    return new Promise(resolve => setTimeout(resolve, delay));
}

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] ${message}`;
    console.log(formatted);

    try {
        fs.appendFileSync(CONFIG.logFile, formatted + '\n');
    } catch (e) { }
}

function getHeaders() {
    return {
        'DEVICE-ID': CONFIG.farmatodo.deviceId,
        'country': 'VEN',
        'source': 'WEB',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.farmatodo.com.ve',
        'Referer': 'https://www.farmatodo.com.ve/'
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchProductsToProcess() {
    log('🔍 Fetching target products from Supabase...');

    // We prioritize products that have sales velocity or are marked as active
    // utilizing the previously synced sales_snapshot or products table
    let query = supabase
        .from('products')
        .select('id, name')
        .limit(LIMIT || 10000); // Process all or limit

    const { data, error } = await query;

    if (error) {
        log(`❌ Error fetching products: ${error.message}`, 'ERROR');
        return [];
    }

    log(`✅ Found ${data.length} products to check.`);
    return data;
}

async function fetchProductStock(productId) {
    const url = `https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2?idItem=${productId}&token=${CONFIG.farmatodo.token}&tokenIdWebSafe=${CONFIG.farmatodo.tokenIdWebSafe}&key=${CONFIG.farmatodo.key}`;

    for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            const res = await axios.get(url, {
                headers: getHeaders(),
                timeout: 30000
            });
            return res.data;
        } catch (e) {
            if (e.response && e.response.status === 404) return null; // No stock

            const isRateLimit = e.response && (e.response.status === 429 || e.response.status === 403);
            if (isRateLimit || attempt < CONFIG.maxRetries) {
                const waitTime = isRateLimit ? 5000 * attempt : 2000;
                log(`   ⚠️ Error ${productId} (Attempt ${attempt}/${CONFIG.maxRetries}): ${e.message}. Waiting ${waitTime}ms...`, 'WARN');
                await new Promise(r => setTimeout(r, waitTime));
            } else {
                log(`   ❌ Failed ${productId}: ${e.message}`, 'ERROR');
                return null;
            }
        }
    }
    return null;
}

async function processStockData(stockData, productId) {
    if (!stockData || !stockData.items) return { stores: [], inventory: [] };

    const stores = [];
    const inventory = [];

    stockData.items.forEach(cityItem => {
        if (!cityItem.municipalityList) return;

        cityItem.municipalityList.forEach(muni => {
            if (!muni.storeGroupList) return;

            muni.storeGroupList.forEach(sg => {
                if (sg.storeList && sg.storeList.length > 0) {
                    const store = sg.storeList[0];
                    const stockCount = sg.stock || 0;

                    stores.push({
                        id: store.id,
                        name: store.name,
                        city: cityItem.name,
                        municipality: muni.name,
                        address: store.address,
                        lat: store.latitude,
                        lng: store.longitude,
                        updated_at: new Date().toISOString()
                    });

                    inventory.push({
                        product_id: productId,
                        sucursal_id: store.id,
                        quantity: stockCount,
                        last_checked: new Date().toISOString()
                    });
                }
            });
        });
    });

    return { stores, inventory };
}

async function syncToSupabase(stores, inventory) {
    if (DRY_RUN) {
        log(`   [DRY-RUN] Would upsert ${stores.length} stores and ${inventory.length} inventory records.`);
        if (inventory.length > 0) log(`   Sample Inv: ${JSON.stringify(inventory[0])}`);
        return;
    }

    if (stores.length > 0) {
        // Upsert stores (deduplicated by ID)
        const uniqueStores = Array.from(new Map(stores.map(s => [s.id, s])).values());
        const { error: storeError } = await supabase
            .from('sucursales')
            .upsert(uniqueStores, { onConflict: 'id' });

        if (storeError) log(`   ❌ Store Upsert Error: ${storeError.message}`, 'ERROR');
    }

    if (inventory.length > 0) {
        const { error: invError } = await supabase
            .from('store_inventory')
            .upsert(inventory, { onConflict: 'product_id,sucursal_id' });

        if (invError) log(`   ❌ Inventory Upsert Error: ${invError.message}`, 'ERROR');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    const startTime = Date.now();
    log('═'.repeat(60));
    log('   GRANULAR STOCK CAPTURE (STEALTH MODE)');
    log('═'.repeat(60));

    try {
        const products = await fetchProductsToProcess();
        let processedCount = 0;
        let totalStockRecords = 0;

        // Resume capability (simple skip for now, could be better)
        let startIndex = 0;

        for (let i = startIndex; i < products.length; i += CONFIG.batchSize) {
            const batch = products.slice(i, i + CONFIG.batchSize);
            const batchPromises = batch.map(async (p) => {
                const data = await fetchProductStock(p.id);
                if (!data) return null;
                return processStockData(data, p.id);
            });

            const results = await Promise.all(batchPromises);

            // Collect all data from batch
            const allStores = [];
            const allInventory = [];

            results.forEach(r => {
                if (r) {
                    allStores.push(...r.stores);
                    allInventory.push(...r.inventory);
                }
            });

            // Sync Batch
            if (allInventory.length > 0) {
                await syncToSupabase(allStores, allInventory);
                totalStockRecords += allInventory.length;
            }

            processedCount += batch.length;
            process.stdout.write(`\rItems processed: ${processedCount}/${products.length} | Stock Records: ${totalStockRecords}`);

            // Stealth Delay
            await randomDelay();
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log(`\n\n✅ CAPTURE COMPLETE`);
        log(`   Duration: ${duration}s`);
        log(`   Products Checked: ${processedCount}`);
        log(`   Stock Records Updated: ${totalStockRecords}`);

    } catch (error) {
        log(`\n❌ FATAL: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

main();
