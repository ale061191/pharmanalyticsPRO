import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Update type definition to handle potential Promise
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> | { id: string } }) {
    const params = await props.params;
    const { id } = params;

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    console.log(`API Hit. ID: ${id}, Days: ${days}`);

    try {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - days);

        // Fetch raw history
        const { data: history, error } = await supabase
            .from('stock_history')
            .select('stock_count, snapshot_date')
            .eq('product_id', id)
            .gte('snapshot_date', thresholdDate.toISOString().split('T')[0])
            .order('snapshot_date', { ascending: true });

        if (error) throw error;

        // Group by Date
        const groupedByDate: Record<string, number> = {};

        history?.forEach(record => {
            const date = record.snapshot_date; // Assumed YYYY-MM-DD
            if (date) {
                groupedByDate[date] = (groupedByDate[date] || 0) + record.stock_count;
            }
        });

        // Convert to array and calculate sales
        const timeline = Object.keys(groupedByDate).sort().map(date => ({
            date,
            stock: groupedByDate[date]
        }));

        // Calculate Estimated Sales (Drops in stock)
        // Note: This is a rough estimate. Restocks appear as negative sales (ignored).
        let cumulativeSales = 0;
        const enrichedTimeline = timeline.map((day, index) => {
            let dailySales = 0;
            if (index > 0) {
                const prevStock = timeline[index - 1].stock;
                const diff = prevStock - day.stock;
                if (diff > 0) {
                    dailySales = diff;
                }
            }
            cumulativeSales += dailySales;

            return {
                ...day,
                sales: dailySales,
                cumulative_sales: cumulativeSales
            };
        });

        return NextResponse.json({
            history: enrichedTimeline,
            meta: {
                total_recorded_sales: cumulativeSales,
                days_tracked: timeline.length
            }
        });

    } catch (err: any) {
        console.error('Error fetching history:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
