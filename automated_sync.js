/**
 * automated_sync.js
 * 
 * AUTOMATED PRODUCT SYNC WORKFLOW
 * ================================
 * 
 * This script handles the complete product synchronization pipeline:
 * 1. Fetches products from Farmatodo via Algolia API
 * 2. Normalizes all data (prices, names, labs)
 * 3. Upserts to Supabase database
 * 4. Logs all operations for monitoring
 * 
 * USAGE:
 *   node automated_sync.js              # Full sync
 *   node automated_sync.js --dry-run    # Preview without database changes
 *   node automated_sync.js --category "Medicamentos"  # Sync specific category
 * 
 * SCHEDULING:
 *   Add to cron or Windows Task Scheduler for automated updates:
 *   0 6 * * * cd /path/to/pharmanalytics && node automated_sync.js >> sync.log 2>&1
 */

require('dotenv').config({ path: '.env.local' });

const algoliasearch = require('algoliasearch');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Price normalizer (our custom module)
const {
    normalizeAlgoliaProduct,
    normalizePrice,
    validateProduct,
    PRICE_THRESHOLDS
} = require('./lib/price_normalizer');

// ===============================
// CONFIGURATION
// ===============================

const CONFIG = {
    // Algolia (Farmatodo)
    ALGOLIA_APP_ID: 'VCOJEYD2PO',
    ALGOLIA_API_KEY: '869a91e98550dd668b8b1dc04bca9011',
    ALGOLIA_INDEX: 'products-vzla',

    // Supabase
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,

    // Sync settings
    BATCH_SIZE: 100,          // Products per Algolia request
    MAX_PRODUCTS: 5000,       // Maximum products to sync per run
    UPSERT_BATCH_SIZE: 50,    // Products per Supabase upsert
    RATE_LIMIT_MS: 200,       // Delay between API calls

    // Logging
    LOG_FILE: 'sync.log',
    VERBOSE: true
};

// Validate environment
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

// Initialize clients
const algolia = algoliasearch(CONFIG.ALGOLIA_APP_ID, CONFIG.ALGOLIA_API_KEY);
const algoliaIndex = algolia.initIndex(CONFIG.ALGOLIA_INDEX);
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ===============================
// LOGGING
// ===============================

const logStream = fs.createWriteStream(CONFIG.LOG_FILE, { flags: 'a' });

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] ${message}`;

    if (CONFIG.VERBOSE || level !== 'DEBUG') {
        console.log(formatted);
    }
    logStream.write(formatted + '\n');
}

// ===============================
// ALGOLIA FETCHING
// ===============================

async function fetchAllProducts(category = null) {
    const products = [];
    let page = 0;
    let hasMore = true;

    log(`🔍 Fetching products from Algolia...`);

    const searchOptions = {
        hitsPerPage: CONFIG.BATCH_SIZE,
        attributesToRetrieve: [
            'objectID', 'id', 'mediaDescription', 'description', 'name',
            'marca', 'brand', 'categorie', 'category',
            'offerPrice', 'fullPrice', 'price',
            'mediaImageUrl', 'imageUrl', 'url',
            'totalStock', 'stock', 'rating', 'reviewCount', 'reviews'
        ]
    };

    if (category) {
        searchOptions.filters = `categorie:"${category}"`;
    }

    while (hasMore && products.length < CONFIG.MAX_PRODUCTS) {
        try {
            const result = await algoliaIndex.search('', {
                ...searchOptions,
                page
            });

            if (result.hits.length === 0) {
                hasMore = false;
            } else {
                products.push(...result.hits);
                page++;

                log(`   Fetched page ${page}: ${result.hits.length} products (total: ${products.length})`, 'DEBUG');

                // Rate limiting
                await sleep(CONFIG.RATE_LIMIT_MS);
            }

            // Check if there are more pages
            hasMore = page < result.nbPages;

        } catch (error) {
            log(`❌ Algolia fetch error on page ${page}: ${error.message}`, 'ERROR');
            hasMore = false;
        }
    }

    log(`✅ Fetched ${products.length} products from Algolia`);
    return products;
}

// ===============================
// DATA PROCESSING
// ===============================

function processProducts(rawProducts) {
    log(`🔧 Processing ${rawProducts.length} products...`);

    const processed = [];
    const skipped = [];

    for (const raw of rawProducts) {
        try {
            const normalized = normalizeAlgoliaProduct(raw);
            const validation = validateProduct(normalized);

            if (validation.valid) {
                processed.push(normalized);
            } else {
                skipped.push({
                    id: normalized.id,
                    name: normalized.name,
                    errors: validation.errors
                });
            }
        } catch (error) {
            log(`⚠️ Error processing product ${raw.objectID}: ${error.message}`, 'WARN');
        }
    }

    log(`✅ Processed: ${processed.length} valid, ${skipped.length} skipped`);

    if (skipped.length > 0 && CONFIG.VERBOSE) {
        log(`   Skipped samples: ${JSON.stringify(skipped.slice(0, 3))}`, 'DEBUG');
    }

    return processed;
}

// ===============================
// DATABASE SYNC
// ===============================

async function syncToSupabase(products, dryRun = false) {
    log(`💾 Syncing ${products.length} products to Supabase${dryRun ? ' (DRY RUN)' : ''}...`);

    if (dryRun) {
        log('   [DRY RUN] Would upsert the following sample:');
        log(`   ${JSON.stringify(products[0], null, 2)}`);
        return { inserted: 0, errors: 0 };
    }

    let inserted = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < products.length; i += CONFIG.UPSERT_BATCH_SIZE) {
        const batch = products.slice(i, i + CONFIG.UPSERT_BATCH_SIZE);

        // Transform to database schema
        const dbRecords = batch.map(p => ({
            name: p.name,
            lab_name: p.lab_name,
            category: p.category,
            avg_price: p.avg_price,
            original_price: p.original_price,
            image_url: p.image_url,
            url: p.url,
            stock_count: p.stock_count,
            rating: p.rating,
            review_count: p.review_count,
            presentation: p.presentation,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('products')
            .upsert(dbRecords, {
                onConflict: 'name',
                ignoreDuplicates: false
            });

        if (error) {
            log(`❌ Batch upsert error: ${error.message}`, 'ERROR');
            errors += batch.length;
        } else {
            inserted += batch.length;
            log(`   Batch ${Math.floor(i / CONFIG.UPSERT_BATCH_SIZE) + 1}: ${batch.length} products`, 'DEBUG');
        }

        // Rate limiting
        await sleep(CONFIG.RATE_LIMIT_MS);
    }

    log(`✅ Sync complete: ${inserted} inserted/updated, ${errors} errors`);
    return { inserted, errors };
}

// ===============================
// PRICE VALIDATION CHECK
// ===============================

async function validateDatabasePrices() {
    log('🔍 Checking database for price anomalies...');

    const { data: suspiciousPrices, error } = await supabase
        .from('products')
        .select('name, avg_price, original_price')
        .or(`avg_price.gt.${PRICE_THRESHOLDS.SUSPICION},original_price.gt.${PRICE_THRESHOLDS.SUSPICION}`)
        .limit(10);

    if (error) {
        log(`❌ Price validation query failed: ${error.message}`, 'ERROR');
        return;
    }

    if (suspiciousPrices && suspiciousPrices.length > 0) {
        log(`⚠️ Found ${suspiciousPrices.length} products with suspicious prices:`, 'WARN');
        suspiciousPrices.forEach(p => {
            log(`   - ${p.name}: Bs.${p.avg_price} (original: ${p.original_price})`, 'WARN');
        });
        log('   Consider running price correction migration.', 'WARN');
    } else {
        log('✅ No price anomalies detected');
    }
}

// ===============================
// UTILITIES
// ===============================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArgs() {
    const args = process.argv.slice(2);
    return {
        dryRun: args.includes('--dry-run'),
        category: args.find((a, i) => args[i - 1] === '--category') || null,
        validateOnly: args.includes('--validate-only'),
        help: args.includes('--help') || args.includes('-h')
    };
}

function showHelp() {
    console.log(`
Pharmanalytics Automated Sync
=============================

Usage: node automated_sync.js [options]

Options:
  --dry-run          Preview changes without writing to database
  --category <name>  Sync only products from specific category
  --validate-only    Only check for price anomalies
  --help, -h         Show this help message

Examples:
  node automated_sync.js                     # Full sync
  node automated_sync.js --dry-run           # Preview mode
  node automated_sync.js --category "Bebé"   # Sync baby products only
  node automated_sync.js --validate-only     # Check price anomalies

Scheduling (cron):
  0 6 * * * cd /path/to/pharmanalytics && node automated_sync.js >> sync.log
    `);
}

// ===============================
// MAIN
// ===============================

async function main() {
    const args = parseArgs();

    if (args.help) {
        showHelp();
        return;
    }

    const startTime = Date.now();
    log('='.repeat(60));
    log('🚀 PHARMANALYTICS AUTOMATED SYNC');
    log('='.repeat(60));

    try {
        // 1. Validate existing prices first
        await validateDatabasePrices();

        if (args.validateOnly) {
            log('Validation complete. Exiting.');
            return;
        }

        // 2. Fetch from Algolia
        const rawProducts = await fetchAllProducts(args.category);

        if (rawProducts.length === 0) {
            log('⚠️ No products fetched from Algolia. Exiting.');
            return;
        }

        // 3. Process and normalize
        const processed = processProducts(rawProducts);

        // 4. Sync to database
        const result = await syncToSupabase(processed, args.dryRun);

        // 5. Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log('='.repeat(60));
        log(`✅ SYNC COMPLETE`);
        log(`   Duration: ${duration}s`);
        log(`   Products synced: ${result.inserted}`);
        log(`   Errors: ${result.errors}`);
        log('='.repeat(60));

    } catch (error) {
        log(`❌ FATAL ERROR: ${error.message}`, 'ERROR');
        log(error.stack, 'ERROR');
        process.exit(1);
    } finally {
        logStream.end();
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

// Export for use in other scripts
module.exports = {
    fetchAllProducts,
    processProducts,
    syncToSupabase,
    validateDatabasePrices
};
