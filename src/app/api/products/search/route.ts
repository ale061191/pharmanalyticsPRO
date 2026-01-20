
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

        let query = supabase
            .from('products')
            .select(`
                id,
                name,
                brand,
                atc_code,
                concentration,
                presentation,
                image_url,
                stock_history (
                    snapshot_date,
                    stock_count
                )
            `);

        // Apply filters
        if (lab) query = query.eq('brand', lab);
        if (atc) query = query.eq('atc_code', atc);
        if (concentration) query = query.eq('concentration', concentration);
        if (presentation) query = query.eq('presentation', presentation);
        if (nameQuery) query = query.ilike('name', `%${nameQuery}%`);

        // Period logic (roughly)
        const days = period === '1w' ? 7 : period === '1m' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        // We filter stock history in the selector if possible or manually after
        // Supabase doesn't support complex joins + filters in one go easily without RPC
        // So we'll fetch and process. For search results, we limit to 50 for performance.
        query = query.limit(50);

        const { data: products, error } = await query;

        if (error) throw error;

        // Process results to include sparkline data
        const processed = products.map((p: any) => {
            // Filter history by period
            const history = (p.stock_history || [])
                .filter((h: any) => h.snapshot_date >= startDateStr)
                .sort((a: any, b: any) => a.snapshot_date.localeCompare(b.snapshot_date))
                .map((h: any) => ({
                    date: h.snapshot_date,
                    value: h.stock_count
                }));

            return {
                id: p.id,
                name: p.name,
                brand: p.brand,
                atc: p.atc_code,
                concentration: p.concentration || 'N/A',
                presentation: p.presentation || 'N/A',
                image: p.image_url,
                history: history
            };
        });

        return NextResponse.json({
            success: true,
            data: processed
        });

    } catch (error: any) {
        console.error("Search API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
