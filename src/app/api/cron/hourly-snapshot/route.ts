import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import algoliasearch from 'algoliasearch';

// Configuration
export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const algoliaClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = algoliaClient.initIndex(ALGOLIA_CONFIG.indexName);

function getHourBucket(): string {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now.toISOString();
}

export async function GET(request: Request) {
    try {
        const fs = require('fs');
        const log = (msg: string) => {
            try {
                fs.appendFileSync('cron-log.txt', `${new Date().toISOString()} - ${msg}\n`);
            } catch (e) {
                // ignore logging errors
            }
        };

        console.log('📸 [Hourly Snapshot] Starting ID-based capture...');
        log('Starting Cron Execution');

        const hourBucket = getHourBucket();
        const recordedAt = new Date().toISOString();

        // 1. Get ALL monitored IDs from Supabase via Pagination
        let allIds: string[] = [];
        let page = 0;
        const DB_PAGE_SIZE = 1000;

        while (true) {
            const { data: products, error: dbError } = await supabase
                .from('products')
                .select('id')
                .range(page * DB_PAGE_SIZE, (page + 1) * DB_PAGE_SIZE - 1);

            if (dbError) {
                log(`DB Error: ${dbError.message}`);
                throw dbError;
            }

            if (!products || products.length === 0) break;

            allIds.push(...products.map(p => p.id));
            // log(`Fetched page ${page}: ${products.length} IDs`); // Optional verbose log

            if (products.length < DB_PAGE_SIZE) break;
            page++;
        }

        const countMsg = `[Hourly Snapshot] Found ${allIds.length} products to update.`;
        console.log(countMsg);
        log(countMsg);

        if (allIds.length === 0) {
            log('No products found in DB');
            return NextResponse.json({ message: 'No products in DB to monitor' });
        }

        // 2. Process in Batches
        const BATCH_SIZE = 1000;
        let processed = 0;
        let inserted = 0;
        let errors = 0;

        for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
            const batchIds = allIds.slice(i, i + BATCH_SIZE).map(String);
            log(`Batch ${i}: Processing ${batchIds.length} IDs. First: ${batchIds[0]}`);

            try {
                // A. Fetch from Algolia
                const algoliaResponse = await index.getObjects(batchIds, {
                    attributesToRetrieve: ['sales', 'stores_with_stock']
                });

                // Handle response format variations
                const hits = (algoliaResponse as any).results || (algoliaResponse as any).objects || algoliaResponse.results || [];
                // log(`Batch ${i}: Algolia returned ${hits ? hits.length : 'undefined'} hits`);

                if (!hits) {
                    log(`Batch ${i}: ALARM - Hits is undefined/null.`);
                    continue;
                }

                const validHits = hits.filter((h: any) => h !== null);
                // log(`Batch ${i}: Valid hits (non-null) = ${validHits.length}`);

                // B. Transform
                const snapshots = validHits.map((p: any) => ({
                    product_id: p.objectID,
                    sales_count: p.sales || 0,
                    stores_count: p.stores_with_stock ? p.stores_with_stock.length : 0,
                    hour_bucket: hourBucket,
                    recorded_at: recordedAt
                }));

                // C. Upsert to Supabase
                if (snapshots.length > 0) {
                    const { error: upsertError } = await supabase
                        .from('hourly_sales')
                        .upsert(snapshots, {
                            onConflict: 'product_id,hour_bucket'
                        });

                    if (upsertError) {
                        const errMsg = `❌ Upsert Error Batch ${i}: ${upsertError.message}`;
                        console.error(errMsg);
                        log(errMsg);
                        errors += snapshots.length;
                    } else {
                        inserted += snapshots.length;
                        log(`Batch ${i}: Upserted ${snapshots.length} records.`);
                    }
                } else {
                    log(`Batch ${i}: No snapshots to insert (0 valid hits?)`);
                }

                processed += batchIds.length;
                console.log(`[Hourly Snapshot] Processed batch ${(i / BATCH_SIZE) + 1}`);

            } catch (err: any) {
                const failMsg = `⚠️ Batch ${i} Failed: ${err.message}`;
                console.error(failMsg);
                log(failMsg);
                errors += batchIds.length;
            }
        }

        const finalMsg = `✅ [Hourly Snapshot] Done. Checked: ${processed}, Saved: ${inserted}, Failed: ${errors}`;
        console.log(finalMsg);
        log(finalMsg);

        return NextResponse.json({
            success: true,
            hourBucket,
            checked: processed,
            inserted,
            errors,
            timestamp: recordedAt
        });

    } catch (e: any) {
        console.error('🔥 [Hourly Snapshot] Fatal:', e);
        // Write error to file for debugging
        const fs = require('fs');
        try {
            fs.appendFileSync('cron-error.txt', `Time: ${new Date().toISOString()}\nError: ${e.message}\nStack: ${e.stack}\n`);
        } catch (fse) { /* ignore write error */ }

        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
