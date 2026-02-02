import { NextResponse } from 'next/server';
import algoliasearch from 'algoliasearch';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient'; // Keep for type fallback if needed, or remove if unused. Actually better to use local admin instance.

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

const algoliaClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = algoliaClient.initIndex(ALGOLIA_CONFIG.indexName);

export const dynamic = 'force-dynamic';

interface MarketShareData {
    laboratory: string;
    totalSales: number;
    productCount: number;
    marketShare: number;
    avgCoverage: number;
    topProduct: {
        id: string;
        name: string;
        sales: number;
    } | null;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ category: string }> }
) {
    try {
        const { category } = await params;
        const decodedCategory = decodeURIComponent(category);
        const MAX_LABS = 20;

        console.log(`[MarketShare] Fetching data for category: ${decodedCategory}`);

        let laboratories: MarketShareData[] = [];
        let topProducts: any[] = [];
        let totalSales = 0;
        let totalCount = 0;

        // CHECK: Is this an ATC Code? (e.g. "A", "A01", "C09")
        // Basic check: 1 to 3 uppercase letters/numbers.
        const isAtcCode = /^[A-Z][0-9A-Z]{0,2}$/.test(decodedCategory) || decodedCategory.length <= 4; // Flexible check

        if (isAtcCode) {
            console.log(`[MarketShare] Detected ATC Code '${decodedCategory}'. Switching to Supabase Aggregation.`);

            // 1. Fetch Products matching ATC Code using ILIKE 'code%'
            // We need to join with sales data.
            // Since we don't have a direct relation easy to group by in one query efficiently without views,
            // we will fetch relevant products first, then aggregate in memory (Node.js is fast enough for ~500-1000 rows),
            // OR use a more complex SQL query if possible. Memory is safer for logic control.

            // Fetch products in this ATC group
            // Fetch products in this ATC group
            console.log(`[MarketShare] Fetching products for ATC prefix: ${decodedCategory}`);
            const { data: dbProducts, error } = await supabaseAdmin
                .from('products')
                .select(`
                    id,
                    clean_name,
                    name,
                    atc_code,
                    image_url,
                    brand
                `)
                .ilike('atc_code', `${decodedCategory}%`);
            // Removed .gt('sales', 0) because products.sales is often 0 or stale. We rely on hourly_sales.

            if (error) throw error;

            if (!dbProducts || dbProducts.length === 0) {
                return NextResponse.json({
                    success: true,
                    category: decodedCategory,
                    totalProducts: 0,
                    totalSales: 0,
                    laboratories: [],
                    topProducts: []
                });
            }

            console.log(`[MarketShare] Found ${dbProducts.length} products. Fetching sales data...`);

            // Fetch sales from hourly_sales (Latest snapshot)
            const productIds = dbProducts.map(p => p.id);
            const { data: salesData, error: salesError } = await supabaseAdmin
                .from('hourly_sales')
                .select('product_id, sales_count, stores_count, recorded_at')
                .in('product_id', productIds)
                .order('recorded_at', { ascending: false });

            if (salesError) console.error("[MarketShare] Error fetching hourly_sales:", salesError);

            // Map sales to products (taking the latest record for each product)
            const productSalesMap = new Map<string, { sales: number; coverage: number }>();

            if (salesData) {
                salesData.forEach((record: any) => {
                    if (!productSalesMap.has(record.product_id)) {
                        // First one is latest due to sort order
                        productSalesMap.set(record.product_id, {
                            sales: record.sales_count || 0,
                            coverage: record.stores_count || 0
                        });
                    }
                });
            }

            // Client-side Aggregation
            const labMap = new Map<string, {
                sales: number;
                products: any[];
                coverageSum: number;
            }>();

            dbProducts.forEach((p: any) => {
                const salesInfo = productSalesMap.get(p.id) || { sales: 0, coverage: 0 };

                // If no sales, skip? Or include with 0? Market Share usually implies sales.
                // If we include 0 sales, we get products but no market share. 
                // Only if sales > 0 does it affect ranking.

                // Laboratory Name Resolution (simplified to use brand column)
                let labName = p.brand || 'Desconocido';

                totalSales += salesInfo.sales;
                totalCount++;

                if (!labMap.has(labName)) {
                    labMap.set(labName, { sales: 0, products: [], coverageSum: 0 });
                }

                const labData = labMap.get(labName)!;
                labData.sales += salesInfo.sales;
                // Attach sales to product object for sorting later
                p.sales = salesInfo.sales;
                p.coverage = salesInfo.coverage;

                labData.products.push(p);
                labData.coverageSum += salesInfo.coverage;
            });

            // Convert to Array
            laboratories = Array.from(labMap.entries()).map(([labName, data]) => {
                const topP = data.products.sort((a, b) => b.sales - a.sales)[0];
                return {
                    laboratory: labName,
                    totalSales: data.sales,
                    productCount: data.products.length,
                    marketShare: 0, // calc later
                    avgCoverage: Math.round(data.coverageSum / data.products.length),
                    topProduct: topP ? {
                        id: topP.id,
                        name: topP.clean_name || topP.name,
                        sales: topP.sales
                    } : null
                };
            });

            // Calculate Market Share & Sort
            laboratories.forEach(l => {
                l.marketShare = totalSales > 0
                    ? Math.round((l.totalSales / totalSales) * 1000) / 10
                    : 0;
            });

            laboratories.sort((a, b) => b.totalSales - a.totalSales);

            // Top Products Global (for this category)
            topProducts = (dbProducts as any[])
                .sort((a, b) => (b.sales || 0) - (a.sales || 0))
                .slice(0, 10)
                .map(p => ({
                    id: p.id,
                    name: p.clean_name || p.name,
                    laboratory: p.brand || 'Desconocido',
                    sales: p.sales || 0,
                    coverage: p.coverage || 0
                }));

        } else {
            // --- LEGACY ALGOLIA FALLBACK (Text Search) ---
            // Keep existing logic for "Medicamentos" or other text keywords

            // First, do a search with facetFilters to get products in this category
            let products: any[] = [];

            // Use search with facetFilters - this works better than browseObjects filters
            const searchResult = await index.search('', {
                facetFilters: [[`categorie:${decodedCategory}`]],
                hitsPerPage: 1000,
                attributesToRetrieve: ['objectID', 'description', 'mediaDescription', 'marca', 'brand', 'sales', 'stores_with_stock', 'categorie']
            });

            products = searchResult.hits as any[];
            console.log(`[MarketShare] Found ${products.length} products with facetFilters`);

            // If still no products, try a text search as fallback
            if (products.length === 0) {
                console.log(`[MarketShare] Trying text search for: ${decodedCategory}`);
                const textResult = await index.search(decodedCategory, {
                    hitsPerPage: 500,
                    attributesToRetrieve: ['objectID', 'description', 'mediaDescription', 'marca', 'brand', 'sales', 'stores_with_stock', 'categorie']
                });
                products = textResult.hits as any[];
            }

            if (products.length === 0) {
                return NextResponse.json({
                    success: true,
                    category: decodedCategory,
                    totalProducts: 0,
                    totalSales: 0,
                    laboratories: [],
                    topProducts: []
                });
            }

            // Group by laboratory
            const labMap = new Map<string, {
                sales: number;
                products: any[];
                coverageSum: number;
            }>();

            products.forEach(p => {
                const lab = p.marca || p.brand || 'Desconocido';
                const sales = p.sales || 0;
                const coverage = Array.isArray(p.stores_with_stock) ? p.stores_with_stock.length : 0;

                totalSales += sales;
                totalCount++; // Just count items

                if (!labMap.has(lab)) {
                    labMap.set(lab, { sales: 0, products: [], coverageSum: 0 });
                }

                const labData = labMap.get(lab)!;
                labData.sales += sales;
                labData.products.push(p);
                labData.coverageSum += coverage;
            });

            // Calculate market share for each laboratory
            labMap.forEach((data, labName) => {
                const topProduct = data.products.sort((a, b) => (b.sales || 0) - (a.sales || 0))[0];

                laboratories.push({
                    laboratory: labName,
                    totalSales: data.sales,
                    productCount: data.products.length,
                    marketShare: totalSales > 0 ? Math.round((data.sales / totalSales) * 1000) / 10 : 0,
                    avgCoverage: data.products.length > 0 ? Math.round(data.coverageSum / data.products.length) : 0,
                    topProduct: topProduct ? {
                        id: topProduct.objectID,
                        name: topProduct.description || topProduct.mediaDescription || 'Sin nombre',
                        sales: topProduct.sales || 0
                    } : null
                });
            });

            // Sort by market share descending
            laboratories.sort((a, b) => b.totalSales - a.totalSales);

            // Get top 10 products in category
            topProducts = products
                .sort((a, b) => (b.sales || 0) - (a.sales || 0))
                .slice(0, 10)
                .map(p => ({
                    id: p.objectID,
                    name: p.description || p.mediaDescription || 'Sin nombre',
                    laboratory: p.marca || p.brand || 'Desconocido',
                    sales: p.sales || 0,
                    coverage: Array.isArray(p.stores_with_stock) ? p.stores_with_stock.length : 0
                }));

            // Enrichment for Algolia results (Names)
            try {
                const productIds = new Set<string>();
                topProducts.forEach(p => productIds.add(p.id));
                laboratories.forEach(l => {
                    if (l.topProduct) productIds.add(l.topProduct.id);
                });

                if (productIds.size > 0) {
                    const { data: dbProducts } = await supabaseAdmin
                        .from('products')
                        .select('id, clean_name')
                        .in('id', Array.from(productIds));

                    if (dbProducts) {
                        const nameMap = new Map<string, string>();
                        dbProducts.forEach(p => {
                            if (p.clean_name) nameMap.set(p.id, p.clean_name);
                        });
                        topProducts.forEach(p => { if (nameMap.has(p.id)) p.name = nameMap.get(p.id)!; });
                        laboratories.forEach(l => { if (l.topProduct && nameMap.has(l.topProduct.id)) l.topProduct.name = nameMap.get(l.topProduct.id)!; });
                    }
                }
            } catch (e) { console.error("Enrichment failed", e); }
        }

        return NextResponse.json({
            success: true,
            category: decodedCategory,
            totalProducts: isAtcCode ? totalCount : topProducts.length, // approximation or explicit count
            totalSales: totalSales,
            laboratories: laboratories.slice(0, MAX_LABS),
            topProducts
        });

    } catch (error: any) {
        console.error('[MarketShare] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
