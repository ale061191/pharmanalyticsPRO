
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Filter params
        const lab = searchParams.get('lab');
        const atc = searchParams.get('atc');
        const nameQuery = searchParams.get('name');
        const concentration = searchParams.get('concentration');
        const presentation = searchParams.get('presentation');
        const period = searchParams.get('period') || '1w';

        // Location params
        const city = searchParams.get('city');
        const municipality = searchParams.get('municipality');
        const branch = searchParams.get('branch');

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const from = (page - 1) * limit;
        const to = from + limit; // Fetch one extra to check for 'hasMore'

        let query = supabase
            .from('products')
            .select(`
                id,
                name,
                clean_name,
                brand,
                sales,
                atc_code,
                concentration,
                presentation,
                image_url,
                is_pharma,
                active_ingredient,
                classification
            `);

        // Apply filters
        if (lab) query = query.eq('brand', lab);
        if (atc) query = query.eq('atc_code', atc);
        if (concentration) query = query.eq('concentration', concentration);
        if (presentation) query = query.eq('presentation', presentation);
        // Search Logic: Fuzzy match (Contains) on clean_name (priority) or name
        if (nameQuery) {
            query = query.or(`clean_name.ilike.${nameQuery}%,name.ilike.${nameQuery}%,active_ingredient.ilike.${nameQuery}%`);
        }

        // NEW: Filter by Therapeutic Group (ATC Prefix)
        const group = searchParams.get('group');
        if (group) {
            query = query.ilike('atc_code', `${group}%`);
        }

        // Period logic (roughly)
        const days = period === '1w' ? 7 : period === '1m' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Apply Pagination
        query = query.order('sales', { ascending: false }).range(from, to);

        const { data: rawProducts, error } = await query;

        if (error) throw error;

        // Check if we have more
        const hasMore = rawProducts.length > limit;
        const products = hasMore ? rawProducts.slice(0, limit) : rawProducts;

        // --- ENRICHMENT START ---

        // 1. Fetch ATC Names
        const uniqueAtcCodes = Array.from(new Set(products.map((p: any) => p.atc_code).filter(Boolean)));
        let atcMap: Record<string, string> = {};

        if (uniqueAtcCodes.length > 0) {
            const { data: atcRefs } = await supabase
                .from('atc_reference')
                .select('atc_code, atc_name')
                .in('atc_code', uniqueAtcCodes);

            if (atcRefs) {
                atcRefs.forEach((ref: any) => {
                    atcMap[ref.atc_code] = ref.atc_name;
                });
            }
        }

        // 2. Fetch Sales History (Manual Join) to avoid Foreign Key issues
        const productIds = products.map((p: any) => p.id);
        let historyByProduct: Record<string, any[]> = {};

        if (productIds.length > 0) {
            const { data: snapshots } = await supabase
                .from('sales_snapshot')
                .select('product_id, snapshot_date, sales_count')
                .in('product_id', productIds)
                .gte('snapshot_date', startDateStr)
                .order('snapshot_date', { ascending: true }); // Ensure chronological order

            if (snapshots) {
                snapshots.forEach((snap: any) => {
                    if (!historyByProduct[snap.product_id]) {
                        historyByProduct[snap.product_id] = [];
                    }
                    historyByProduct[snap.product_id].push(snap);
                });
            }
        }

        // Process results to include sparkline data
        const processed = products.map((p: any) => {
            const productHistory = historyByProduct[p.id] || [];

            // Aggregate history by date (handle duplicates if any)
            const historyMap = productHistory.reduce((acc: any, curr: any) => {
                if (!acc[curr.snapshot_date]) {
                    acc[curr.snapshot_date] = 0;
                }
                // Max sales count for that day (cumulative odometer)
                acc[curr.snapshot_date] = Math.max(acc[curr.snapshot_date], curr.sales_count);
                return acc;
            }, {});

            const history = Object.entries(historyMap)
                .map(([date, value]: [string, any]) => ({
                    date,
                    value: value
                }))
                .sort((a: any, b: any) => a.date.localeCompare(b.date));

            return {
                id: p.id,
                name: p.name,
                clean_name: p.clean_name,
                brand: p.brand,
                atc: p.atc_code,
                therapeutic_group: atcMap[p.atc_code] || null, // <--- NEW FIELD
                concentration: p.concentration || 'N/A',
                presentation: p.presentation || 'N/A',
                image: p.image_url,
                is_pharma: p.is_pharma,
                active_ingredient: p.active_ingredient,
                classification: p.classification,
                history: history
            };
        });

        return NextResponse.json({
            success: true,
            data: processed,
            hasMore,
            nextPage: hasMore ? page + 1 : null
        });

    } catch (error: any) {
        console.error("Search API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
