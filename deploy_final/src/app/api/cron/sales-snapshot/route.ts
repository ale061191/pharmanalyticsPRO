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
        const products: any[] = [];

        // 2. Fetch all products (Algolia)
        await index.browseObjects({
            batch: (batch) => {
                products.push(...batch);
            },
            attributesToRetrieve: ['objectID', 'id', 'sales', 'totalStock', 'stores_with_stock']
        });

        if (products.length === 0) {
            return NextResponse.json({ message: 'No products captured' }, { status: 200 });
        }

        // 3. Prepare Snapshots
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const capturedAt = new Date().toISOString();

        // 4. Upsert by Batches
        let inserted = 0;
        let errors = 0;
        const BATCH_SIZE = 50;

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE).map((p: any) => ({
                product_id: p.objectID || p.id,
                sales_count: p.sales || 0,
                stock_count: p.totalStock || (p.stores_with_stock ? p.stores_with_stock.length : 0),
                snapshot_date: today,
                captured_at: capturedAt
            }));

            const { error } = await supabase
                .from('sales_snapshot')
                .upsert(batch, {
                    onConflict: 'product_id,snapshot_date',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error(`❌ Batch error: ${error.message}`);
                errors += batch.length;
            } else {
                inserted += batch.length;
            }
        }

        console.log(`✅ Snapshot Complete: ${inserted} saved.`);

        return NextResponse.json({
            success: true,
            products_scanned: products.length,
            snapshots_saved: inserted,
            timestamp: capturedAt
        });

    } catch (error: any) {
        console.error('🔥 Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
