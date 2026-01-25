import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const productSearch = url.searchParams.get('product') || '';
        const labFilter = url.searchParams.get('lab') || '';
        const categoryFilter = url.searchParams.get('category') || '';
        const cityFilter = url.searchParams.get('city') || '';
        const municipalityFilter = url.searchParams.get('municipality') || '';

        // 1. Fetch Branches (Base Functionality)
        let branchQuery = supabase
            .from('sucursales')
            .select('id, name, city, municipality, lat, lng, address');

        if (cityFilter) {
            branchQuery = branchQuery.eq('city', cityFilter);
        }
        if (municipalityFilter) {
            branchQuery = branchQuery.eq('municipality', municipalityFilter);
        }

        const { data: branches, error: branchError } = await branchQuery;

        if (branchError || !branches) {
            throw new Error(branchError?.message || 'Failed to fetch branches');
        }

        // 2. Fetch Stock Data if a Product is selected (Intelligence Layer)
        let stockMap = new Map(); // Store: string -> { status, stock }

        if (productSearch) {
            let stockQuery = supabase
                .from('stock_detail')
                .select('store_name, stock_count, availability_status, product_name, lab_name')
                .ilike('product_name', `%${productSearch}%`); // Partial match allowed

            if (labFilter) {
                stockQuery = stockQuery.ilike('lab_name', `%${labFilter}%`);
            }
            // Category filter would require joining products table, skipping for MVP speed unless critical
            // We'll rely on product name search for specific findings or pre-filter in UI.

            const { data: stockData, error: stockError } = await stockQuery;

            if (stockData) {
                stockData.forEach(item => {
                    // Normalize store name or use a stronger ID link in future
                    // ideally we link by ID, but text link works for this demo
                    stockMap.set(item.store_name, {
                        count: item.stock_count,
                        status: item.availability_status
                    });
                });
            }
        }

        // 3. Merge Data
        const enrichedBranches = branches.map(branch => {
            const stockInfo = stockMap.get(branch.name);

            // Determine Marker Color / Status
            // Default: Purple (Neutral)
            // If Product Selected: Green (High), Yellow (Med), Red (Low/None)

            let status = 'neutral';
            let stockCount = null;

            if (productSearch) {
                if (stockInfo) {
                    status = stockInfo.status === 'high' ? 'healthy' :
                        stockInfo.status === 'medium' ? 'warning' : 'critical';
                    stockCount = stockInfo.count;
                } else {
                    status = 'critical'; // No stock record implies out of stock
                    stockCount = 0;
                }
            }

            return {
                ...branch,
                status, // neutral, healthy, warning, critical
                stockCount
            };
        });

        // 4. Get Unique Options for Filters (Simple Aggregation)
        // Ideally cached or separate DB calls, but for MVP we return known sets?
        // Let's just return the data. The frontend can derive current options or we hardcode common ones.

        return NextResponse.json({
            success: true,
            data: enrichedBranches,
            filters: {
                city: cityFilter,
                municipality: municipalityFilter,
                product: productSearch
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
