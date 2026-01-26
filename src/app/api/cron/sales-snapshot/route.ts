import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import algoliasearch from 'algoliasearch';

// Configuration
const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const algoliaClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = algoliaClient.initIndex(ALGOLIA_CONFIG.indexName);

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('📸 Cron Start: Daily Sales Snapshot...');

        // 2. Preparation
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const capturedAt = new Date().toISOString();
        const startTime = Date.now();

        // 3. Get ALL monitored IDs from Supabase via Pagination
        let allIds: string[] = [];
        let page = 0;
        const DB_PAGE_SIZE = 1000;

        while (true) {
            const { data: products, error: dbError } = await supabase
                .from('products')
                .select('id')
                .order('id', { ascending: true }) // CRITICAL: Ensure stable ordering
                .range(page * DB_PAGE_SIZE, (page + 1) * DB_PAGE_SIZE - 1);

            if (dbError) {
                console.error(`DB Error: ${dbError.message}`);
                throw dbError;
            }

            if (!products || products.length === 0) break;

            // Trim IDs to ensure matches with Algolia
            allIds.push(...products.map(p => String(p.id).trim()));

            if (products.length < DB_PAGE_SIZE) break;
            page++;
        }

        if (allIds.length === 0) {
            console.log('No products found in DB');
            return NextResponse.json({ message: 'No products in DB to monitor' });
        }

        console.log(`[Daily Snapshot] Found ${allIds.length} products to update.`);

        // 4. Process in Batches (Safe Size)
        const BATCH_SIZE = 200;
        let processed = 0;
        let inserted = 0;
        let errors = 0;

        for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
            // Check for Timeout Risk (leave 20s buffer)
            if (Date.now() - startTime > (maxDuration - 20) * 1000) {
                const timeoutMsg = `⚠️ Time limit approaching. Stopping at ${processed}/${allIds.length}`;
                console.warn(timeoutMsg);
                break;
            }

            const batchIds = allIds.slice(i, i + BATCH_SIZE);

            try {
                // A. Fetch from Algolia
                const algoliaResponse = await index.getObjects(batchIds, {
                    attributesToRetrieve: ['sales', 'totalStock', 'stores_with_stock']
                });

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
                    stock_count: p.totalStock || (p.stores_with_stock ? p.stores_with_stock.length : 0),
                    snapshot_date: today,
                    captured_at: capturedAt
                }));

                // C. Upsert
                if (snapshots.length > 0) {
                    const { error: upsertError } = await supabase
                        .from('sales_snapshot')
                        .upsert(snapshots, {
                            onConflict: 'product_id,snapshot_date',
                            ignoreDuplicates: false
                        });

                    if (upsertError) {
                        console.error(`❌ Upsert Error Batch ${i}: ${upsertError.message}`);
                        errors += snapshots.length;
                    } else {
                        inserted += snapshots.length;
                    }
                }

                processed += batchIds.length;

            } catch (err: any) {
                console.error(`⚠️ Batch ${i} Failed: ${err.message}`);
                errors += batchIds.length;
            }
        }

        const finalMsg = `✅ [Daily Snapshot] Complete: ${inserted} saved, ${errors} failed.`;
        console.log(finalMsg);

        return NextResponse.json({
            success: true,
            products_scanned: processed,
            snapshots_saved: inserted,
            timestamp: capturedAt
        });

    } catch (error: any) {
        console.error('🔥 Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
