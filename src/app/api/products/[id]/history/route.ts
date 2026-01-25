import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getAggregateStock } from '@/lib/algoliaClient';

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
        let timeline = Object.keys(groupedByDate).sort().map(date => ({
            date,
            stock: groupedByDate[date]
        }));

        // INJECTION: Get Real-Time Stock from Algolia to show "Live" data
        // IMPORTANT: Algolia's totalStock is sometimes 0 even when stores have stock.
        // Only use live data if it's actually reliable (> 0).
        try {
            const liveStats = await getAggregateStock(id);
            const liveStock = liveStats.total_stock;
            const todayDate = new Date().toISOString().split('T')[0];
            const hasToday = timeline.some(t => t.date === todayDate);

            // If Algolia returns valid stock (> 0), use it
            if (liveStats.found && liveStock > 0) {
                if (!hasToday) {
                    timeline.push({ date: todayDate, stock: liveStock });
                } else {
                    const idx = timeline.findIndex(t => t.date === todayDate);
                    timeline[idx].stock = liveStock;
                }
            }
            // If Algolia returns 0 but we have historical data, extrapolate today's point
            else if (timeline.length > 0 && !hasToday) {
                // Extrapolate from last known stock, applying average daily sales if available
                const lastKnownStock = timeline[timeline.length - 1].stock;
                const lastKnownDate = new Date(timeline[timeline.length - 1].date);
                const today = new Date(todayDate);
                const daysSinceLastRecord = Math.ceil((today.getTime() - lastKnownDate.getTime()) / (1000 * 60 * 60 * 24));

                // Estimate daily sales rate from history (if we have at least 2 points)
                let estimatedDailySales = 0;
                if (timeline.length >= 2) {
                    const firstStock = timeline[0].stock;
                    const firstDate = new Date(timeline[0].date);
                    const totalDays = Math.ceil((lastKnownDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                    const totalDecrease = firstStock - lastKnownStock;
                    if (totalDecrease > 0) {
                        estimatedDailySales = totalDecrease / totalDays;
                    }
                }

                // Project current stock (minimum 0)
                const projectedStock = Math.max(0, Math.round(lastKnownStock - (estimatedDailySales * daysSinceLastRecord)));

                console.log(`[History] Extrapolating stock: ${lastKnownStock} - (${estimatedDailySales.toFixed(1)} * ${daysSinceLastRecord}) = ${projectedStock}`);

                timeline.push({ date: todayDate, stock: projectedStock });
            }
        } catch (err) {
            console.error("Failed to inject live stats:", err);
        }

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
