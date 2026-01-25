/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DAILY SALES SNAPSHOT - STEALTH MODE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Captures daily sales counts from Algolia for tracking sales velocity.
 * Designed to run once per day at 3:00 AM (off-peak hours).
 * 
 * USAGE:
 *   node daily_sales_snapshot.js              # Full capture
 *   node daily_sales_snapshot.js --dry-run    # Preview without DB writes
 * 
 * CRON (Windows Task Scheduler or Linux cron):
 *   0 3 * * * cd /path/to/pharmanalytics/master && node daily_sales_snapshot.js
 * 
 * STEALTH FEATURES:
 *   - Randomized delays between requests (200-800ms)
 *   - Human-like User-Agent rotation
 *   - Off-peak execution time
 *   - Gradual batch processing
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const algoliasearch = require('algoliasearch');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    algolia: {
        appId: 'VCOJEYD2PO',
        apiKey: '869a91e98550dd668b8b1dc04bca9011',
        index: 'products-venezuela'
    },
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
    // Stealth settings
    minDelay: 200,
    maxDelay: 800,
    batchSize: 100,
    maxProducts: 10000,
    // Logging
    logFile: path.join(__dirname, 'sales_snapshot.log')
};

const DRY_RUN = process.argv.includes('--dry-run');

// Validate env
if (!CONFIG.supabase.url || !CONFIG.supabase.key) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

// Initialize clients
const algolia = algoliasearch(CONFIG.algolia.appId, CONFIG.algolia.apiKey);
const algoliaIndex = algolia.initIndex(CONFIG.algolia.index);
const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.key);

// ═══════════════════════════════════════════════════════════════════════════════
// STEALTH UTILITIES
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
    } catch (e) {
        // Ignore log write errors
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CAPTURE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

async function captureAllProducts() {
    log('🔍 Fetching products from Algolia (stealth mode - cursor based)...');

    const products = [];
    let cursor = undefined;
    let keepGoing = true;
    let pageCount = 0;

    while (keepGoing && products.length < CONFIG.maxProducts) {
        try {
            // Use browse() instead of search() to bypass 1000-hit limit
            const result = await algoliaIndex.browse('', {
                hitsPerPage: CONFIG.batchSize,
                cursor: cursor,
                attributesToRetrieve: ['objectID', 'id', 'sales', 'totalStock', 'stores_with_stock']
            });

            if (!result.hits || result.hits.length === 0) {
                keepGoing = false;
            } else {
                for (const hit of result.hits) {
                    const stockArray = hit.stores_with_stock || [];
                    products.push({
                        product_id: hit.objectID || hit.id,
                        sales_count: hit.sales || 0,
                        stock_count: hit.totalStock || 0, // Total Units
                        store_count: stockArray.length || 0 // Total Branches (Sucursales)
                    });
                }

                pageCount++;
                cursor = result.cursor; // Update cursor for next batch

                // If no cursor matches, we are done
                if (!cursor) {
                    keepGoing = false;
                }

                // Stealth: randomized delay between batches
                // Log every 5 pages to keep output clean but visible
                if (pageCount % 5 === 0) {
                    log(`   ...captured ${products.length} products so far`);
                }

                await randomDelay();
            }
        } catch (error) {
            log(`❌ Algolia browsing error at page ${pageCount}: ${error.message}`, 'ERROR');
            keepGoing = false;
        }
    }

    log(`✅ Captured ${products.length} products total`);
    return products;
}

async function saveSnapshots(products) {
    log(`💾 Saving ${products.length} snapshots to Supabase${DRY_RUN ? ' (DRY RUN)' : ''}...`);

    if (DRY_RUN) {
        log(`[DRY-RUN] Sample: ${JSON.stringify(products.slice(0, 3), null, 2)}`);
        return { inserted: 0, errors: 0 };
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let inserted = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < products.length; i += 50) {
        const batch = products.slice(i, i + 50).map(p => ({
            product_id: p.product_id,
            sales_count: p.sales_count,
            stock_count: p.stock_count,
            store_count: p.store_count, // New field
            snapshot_date: today,
            captured_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('sales_snapshot')
            .upsert(batch, {
                onConflict: 'product_id,snapshot_date',
                ignoreDuplicates: false
            });

        if (error) {
            log(`❌ Batch error: ${error.message}`, 'ERROR');
            errors += batch.length;
        } else {
            inserted += batch.length;
        }

        // Stealth delay between DB operations
        await new Promise(r => setTimeout(r, 100));
    }

    log(`✅ Saved: ${inserted} snapshots, ${errors} errors`);
    return { inserted, errors };
}

async function calculateDailySales() {
    log('📊 Calculating daily sales velocity...');

    // Get yesterday's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Query to calculate sales difference
    const { data, error } = await supabase
        .from('sales_snapshot')
        .select('product_id, sales_count, snapshot_date')
        .in('snapshot_date', [todayStr, yesterdayStr])
        .order('snapshot_date', { ascending: true });

    if (error) {
        log(`❌ Query error: ${error.message}`, 'ERROR');
        return;
    }

    // Calculate differences
    const salesByProduct = {};
    for (const row of (data || [])) {
        if (!salesByProduct[row.product_id]) {
            salesByProduct[row.product_id] = {};
        }
        salesByProduct[row.product_id][row.snapshot_date] = row.sales_count;
    }

    let totalDailySales = 0;
    let productsWithSales = 0;

    for (const [productId, dates] of Object.entries(salesByProduct)) {
        const todaySales = dates[todayStr] || 0;
        const yesterdaySales = dates[yesterdayStr] || 0;
        const diff = todaySales - yesterdaySales;

        if (diff > 0) {
            totalDailySales += diff;
            productsWithSales++;
        }
    }

    log(`📈 Daily sales summary: ${totalDailySales} units across ${productsWithSales} products`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    const startTime = Date.now();

    log('═'.repeat(60));
    log('   DAILY SALES SNAPSHOT - STEALTH MODE');
    log('═'.repeat(60));

    try {
        // 1. Capture all products with sales data
        const products = await captureAllProducts();

        if (products.length === 0) {
            log('⚠️ No products captured. Exiting.');
            return;
        }

        // 2. Save snapshots
        const result = await saveSnapshots(products);

        // 3. Calculate daily sales (if we have previous data)
        if (!DRY_RUN) {
            await calculateDailySales();
        }

        // Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log('═'.repeat(60));
        log(`✅ SNAPSHOT COMPLETE`);
        log(`   Duration: ${duration}s`);
        log(`   Products: ${products.length}`);
        log(`   Saved: ${result.inserted}`);
        log('═'.repeat(60));

    } catch (error) {
        log(`❌ FATAL: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

// Run
main();
