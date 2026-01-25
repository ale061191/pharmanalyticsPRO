import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import algoliasearch from 'algoliasearch';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

const algoliaClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = algoliaClient.initIndex(ALGOLIA_CONFIG.indexName);

// Helper to get the start of current hour
function getHourBucket(date: Date = new Date()): string {
    const d = new Date(date);
    d.setMinutes(0, 0, 0);
    return d.toISOString();
}

// Helper to get start of today (Venezuela timezone, UTC-4)
function getStartOfToday(): string {
    const now = new Date();
    // Adjust for Venezuela time (UTC-4)
    const venezuelaOffset = -4 * 60;
    const localOffset = now.getTimezoneOffset();
    const diff = venezuelaOffset - localOffset;

    const venezuelaNow = new Date(now.getTime() + diff * 60000);
    venezuelaNow.setHours(0, 0, 0, 0);

    // Convert back to UTC for database query
    return new Date(venezuelaNow.getTime() - diff * 60000).toISOString();
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;

        // 1. Get current sales from Algolia
        const searchResult = await index.search('', {
            filters: `objectID:${productId}`,
            attributesToRetrieve: ['objectID', 'sales', 'stores_with_stock']
        });

        let currentSales = 0;
        let currentStores = 0;

        if (searchResult.hits.length > 0) {
            const product = searchResult.hits[0] as any;
            currentSales = product.sales || 0;
            currentStores = product.stores_with_stock?.length || 0;
        }

        const currentHourBucket = getHourBucket();

        // 2. Upsert current hour snapshot (only if we got valid data)
        if (currentSales > 0 || currentStores > 0) {
            await supabase
                .from('hourly_sales')
                .upsert({
                    product_id: productId,
                    sales_count: currentSales,
                    stores_count: currentStores,
                    hour_bucket: currentHourBucket,
                    recorded_at: new Date().toISOString()
                }, {
                    onConflict: 'product_id,hour_bucket'
                });
        }

        // 3. Get last 24 hours of data for this product (Rolling Window)
        const get24HoursAgo = () => {
            const date = new Date();
            date.setHours(date.getHours() - 24);
            return date.toISOString();
        };
        const startTime = get24HoursAgo();

        const { data: hourlyData, error } = await supabase
            .from('hourly_sales')
            .select('sales_count, stores_count, hour_bucket')
            .eq('product_id', productId)
            .gte('hour_bucket', startTime)
            .order('hour_bucket', { ascending: true });

        if (error) {
            console.error('[Intraday] DB error:', error);
            // Return just the current point if table doesn't exist yet
            return NextResponse.json({
                success: true,
                productId,
                currentSales,
                currentStores,
                trend: [{
                    hour: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    sales: currentSales,
                    stores: currentStores,
                    hourBucket: currentHourBucket,
                    delta: 0,
                    velocity_status: 'stable'
                }],
                metrics: {
                    velocity: 0,
                    trend: 'stable',
                    total_moved: 0
                }
            });
        }

        // 4. Process data: Fill gaps and calculate deltas
        const trend = [];
        let totalMovedInPeriod = 0;

        const rawData = hourlyData || [];

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const currentSalesCount = row.sales_count;

            // Calculate delta from previous hour
            let delta = 0;
            if (i > 0) {
                delta = Math.max(0, currentSalesCount - rawData[i - 1].sales_count);
            }

            totalMovedInPeriod += delta;

            const hourDate = new Date(row.hour_bucket);
            trend.push({
                hour: hourDate.toLocaleTimeString('es-VE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'America/Caracas'
                }),
                sales: currentSalesCount,
                stores: row.stores_count,
                hourBucket: row.hour_bucket,
                delta: delta,
                velocity_status: delta > 5 ? 'high' : (delta > 0 ? 'moderate' : 'low')
            });
        }

        // 5. Always include current point as the latest snapshot
        const lastRecorded = trend.length > 0 ? trend[trend.length - 1] : null;
        const lastHourBucket = lastRecorded ? lastRecorded.hourBucket : null;

        if (lastHourBucket !== currentHourBucket && currentSales > 0) {
            const delta = lastRecorded ? Math.max(0, currentSales - lastRecorded.sales) : 0;
            totalMovedInPeriod += delta;

            trend.push({
                hour: new Date().toLocaleTimeString('es-VE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'America/Caracas'
                }),
                sales: currentSales,
                stores: currentStores,
                hourBucket: currentHourBucket,
                delta: delta,
                velocity_status: delta > 5 ? 'high' : (delta > 0 ? 'moderate' : 'low')
            });
        }

        // Calculate dynamic metrics
        // Trend calculation based on recent deltas
        const totalHours = trend.length || 1;
        const velocityPerHour = totalMovedInPeriod / totalHours; // Average units/hour today

        let trendDirection = 'stable';
        if (trend.length >= 2) {
            const lastDeltas = trend.slice(-3).map(t => t.delta);
            const avgRecent = lastDeltas.reduce((a, b) => a + b, 0) / lastDeltas.length;

            // If recent average is significantly higher than overall daily average
            if (avgRecent > velocityPerHour * 1.5) trendDirection = 'accelerating';
            else if (avgRecent < velocityPerHour * 0.5 && avgRecent > 0) trendDirection = 'decelerating';
            else if (avgRecent === 0 && velocityPerHour > 0) trendDirection = 'stalled';
        }

        return NextResponse.json({
            success: true,
            productId,
            currentSales,
            currentStores,
            startTime,
            trend,
            metrics: {
                velocity: Math.round(velocityPerHour * 10) / 10,
                total_moved: totalMovedInPeriod,
                trend: trendDirection
            }
        });

    } catch (e: any) {
        console.error('[Intraday] Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
