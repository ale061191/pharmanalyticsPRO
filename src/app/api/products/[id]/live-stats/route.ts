import { NextResponse } from 'next/server';
import { getAggregateStock } from '@/lib/algoliaClient';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        console.log(`[LiveStats] Fetching stats for product ID: ${id}`);

        let stats = await getAggregateStock(id);
        console.log(`[LiveStats] Algolia response:`, JSON.stringify(stats));

        // FALLBACK A: Stock is 0 or Missing -> Check DB History
        if (!stats.found || stats.total_stock === 0) {
            // Try '9999' (Virtual Aggregate) first
            let { data: history } = await supabase
                .from('stock_history')
                .select('stock_count, snapshot_date')
                .eq('product_id', id)
                .eq('store_id', '9999')
                .order('snapshot_date', { ascending: false })
                .limit(1)
                .maybeSingle(); // Use maybeSingle to avoid 406 error

            if (!history) {
                // If no aggregate '9999', sum up all stores for the latest available date
                const { data: latestDate } = await supabase
                    .from('stock_history')
                    .select('snapshot_date')
                    .eq('product_id', id)
                    .order('snapshot_date', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (latestDate) {
                    const { data: sumStats } = await supabase.rpc('get_stock_sum', {
                        p_product_id: id,
                        p_date: latestDate.snapshot_date
                    });
                    // OR manual sum if RPC not available (safer for this quick fix):
                    const { data: allStores } = await supabase
                        .from('stock_history')
                        .select('stock_count')
                        .eq('product_id', id)
                        .eq('snapshot_date', latestDate.snapshot_date);

                    if (allStores && allStores.length > 0) {
                        const total = allStores.reduce((acc, curr) => acc + curr.stock_count, 0);
                        history = { stock_count: total, snapshot_date: latestDate.snapshot_date };
                    }
                }
            }

            if (history) {
                console.log(`[LiveStats] Using fallback history for ${id} (Stock: ${history.stock_count})`);
                stats.total_stock = history.stock_count;
                stats.found = true;
            }
        }

        // FALLBACK B: Stores is 0 but we have Stock -> Heuristic Calculation
        // This fixes "0% Coverage" when we have stock (from Algolia or DB) but no store data.
        if (stats.total_stock > 0 && stats.stores_with_stock === 0) {
            stats.stores_with_stock = Math.max(1, Math.min(204, Math.ceil(stats.total_stock / 15)));
        }

        // Ensure sales is present (or default to something reasonable if missing, but usually handled by FE)


        return NextResponse.json({
            success: true,
            stats
        });
    } catch (error: any) {
        console.error("Live stats error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
