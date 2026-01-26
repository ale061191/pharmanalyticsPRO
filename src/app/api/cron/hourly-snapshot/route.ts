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
    // 0. Authorization Check (Security Fix)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('📸 [Hourly Snapshot] Starting ID-based capture...');

        const hourBucket = getHourBucket();
        const recordedAt = new Date().toISOString();

        // 1. Get ONLY Top 500 monitored IDs (Ghost Strategy: Layer 1)
        // We focus on high-velocity items for hourly tracking to minimize Algolia API hits
        let allIds: string[] = [];

        const { data: products, error: dbError } = await supabase
            .from('products')
            .select('id')
            .order('sales', { ascending: false }) // Prioritize High Velocity
            .limit(500); // 🚧 LIMIT TO 500 PER HOUR (360k ops/month total)

        if (dbError) {
            console.error(`DB Error: ${dbError.message}`);
            throw dbError;
        }

        if (products && products.length > 0) {
            allIds = products.map(p => String(p.id).trim());
        }

        const countMsg = `[Hourly Snapshot] Found ${allIds.length} products to update.`;
        console.log(countMsg);
        // countMsg already verified console.log above

        if (allIds.length === 0) {
            console.log('No products found in DB');
            return NextResponse.json({ message: 'No products in DB to monitor' });
        }

        // 2. Process in Batches (Reduced size for reliability)
        const BATCH_SIZE = 200; // Reduced from 1000 to prevent Algolia payload limits
        let processed = 0;
        let inserted = 0;
        let errors = 0;
        const startTime = Date.now();

        for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
            // Check for Timeout Risk (leave 20s buffer)
            if (Date.now() - startTime > (maxDuration - 20) * 1000) {
                const timeoutMsg = `⚠️ Time limit approaching. Stopping at ${processed}/${allIds.length}`;
                console.warn(timeoutMsg);
                // timeout msg logged via console.warn above
                break;
            }

            const batchIds = allIds.slice(i, i + BATCH_SIZE); // IDs are already strings and trimmed
            // log(`Batch ${i}: Processing ${batchIds.length} IDs. First: ${batchIds[0]}`);

            try {
                // A. Fetch from Algolia
                const algoliaResponse = await index.getObjects(batchIds, {
                    attributesToRetrieve: ['sales', 'stores_with_stock']
                });

                // Handle data
                const hits = (algoliaResponse as any).results || (algoliaResponse as any).objects || [];

                if (!hits) {
                    console.warn(`Batch ${i}: ALARM - Hits is undefined.`);
                    continue;
                }

                // Filter valid hits
                const validHits = hits.filter((h: any) => h !== null);

                // B. Transform
                const snapshots = validHits.map((p: any) => ({
                    product_id: p.objectID,
                    sales_count: p.sales || 0,
                    stores_count: p.stores_with_stock ? p.stores_with_stock.length : 0,
                    hour_bucket: hourBucket,
                    recorded_at: recordedAt
                }));

                // C. Upsert
                if (snapshots.length > 0) {
                    const { error: upsertError } = await supabase
                        .from('hourly_sales')
                        .upsert(snapshots, {
                            onConflict: 'product_id,hour_bucket'
                        });

                    if (upsertError) {
                        const errMsg = `❌ Upsert Error Batch ${i}: ${upsertError.message}`;
                        console.error(errMsg);
                        // console.log(errMsg);
                        errors += snapshots.length;
                    } else {
                        inserted += snapshots.length;
                        // log(`Batch ${i}: Upserted ${snapshots.length} records.`);
                    }
                }

                processed += batchIds.length;

            } catch (err: any) {
                const failMsg = `⚠️ Batch ${i} Failed: ${err.message}`;
                console.error(failMsg);
                console.error(failMsg);
                errors += batchIds.length;
            }
        }

        const finalMsg = `✅ [Hourly Snapshot] Done. Checked: ${processed}, Saved: ${inserted}, Failed: ${errors}`;
        console.log(finalMsg);
        // finalMsg logged via console.log above

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
