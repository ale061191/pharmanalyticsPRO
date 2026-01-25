import { NextResponse } from 'next/server';
import algoliasearch from 'algoliasearch';
import { supabase } from '@/lib/supabaseClient';

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

        console.log(`[MarketShare] Fetching data for category: ${decodedCategory}`);

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

        let categoryTotalSales = 0;

        products.forEach(p => {
            const lab = p.marca || p.brand || 'Desconocido';
            const sales = p.sales || 0;
            const coverage = Array.isArray(p.stores_with_stock) ? p.stores_with_stock.length : 0;

            categoryTotalSales += sales;

            if (!labMap.has(lab)) {
                labMap.set(lab, { sales: 0, products: [], coverageSum: 0 });
            }

            const labData = labMap.get(lab)!;
            labData.sales += sales;
            labData.products.push(p);
            labData.coverageSum += coverage;
        });

        // Calculate market share for each laboratory
        const laboratories: MarketShareData[] = [];

        labMap.forEach((data, labName) => {
            const topProduct = data.products.sort((a, b) => (b.sales || 0) - (a.sales || 0))[0];

            laboratories.push({
                laboratory: labName,
                totalSales: data.sales,
                productCount: data.products.length,
                marketShare: categoryTotalSales > 0 ? Math.round((data.sales / categoryTotalSales) * 1000) / 10 : 0,
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
        const topProducts = products
            .sort((a, b) => (b.sales || 0) - (a.sales || 0))
            .slice(0, 10)
            .map(p => ({
                id: p.objectID,
                name: p.description || p.mediaDescription || 'Sin nombre',
                laboratory: p.marca || p.brand || 'Desconocido',
                sales: p.sales || 0,
                coverage: Array.isArray(p.stores_with_stock) ? p.stores_with_stock.length : 0
            }));

        // ------------------------------------------------------------------
        // ENRICH WITH CLEAN NAMES FROM SUPABASE
        // ------------------------------------------------------------------
        try {
            // Collect all relevant IDs (Top 10 Products + Top Product for each Lab)
            const productIds = new Set<string>();
            topProducts.forEach(p => productIds.add(p.id));
            laboratories.forEach(l => {
                if (l.topProduct) productIds.add(l.topProduct.id);
            });

            if (productIds.size > 0) {
                const { data: dbProducts } = await supabase
                    .from('products')
                    .select('id, clean_name')
                    .in('id', Array.from(productIds));

                if (dbProducts) {
                    const nameMap = new Map<string, string>();
                    dbProducts.forEach(p => {
                        if (p.clean_name) nameMap.set(p.id, p.clean_name);
                    });

                    // Update Top Products
                    topProducts.forEach(p => {
                        if (nameMap.has(p.id)) {
                            p.name = nameMap.get(p.id)!;
                        }
                    });

                    // Update Laboratory Top Products
                    laboratories.forEach(l => {
                        if (l.topProduct && nameMap.has(l.topProduct.id)) {
                            l.topProduct.name = nameMap.get(l.topProduct.id)!;
                        }
                    });

                    console.log(`[MarketShare] Enriched ${nameMap.size} products with clean names`);
                }
            }
        } catch (enrichError) {
            console.error('[MarketShare] Failed to enrich with clean names:', enrichError);
            // Continue with raw names if enrichment fails
        }

        return NextResponse.json({
            success: true,
            category: decodedCategory,
            totalProducts: products.length,
            totalSales: categoryTotalSales,
            laboratories: laboratories.slice(0, 20), // Top 20 labs
            topProducts
        });

    } catch (error: any) {
        console.error('[MarketShare] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
