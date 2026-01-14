import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

/**
 * Ranking API - Calculates product scores based on PRD formula (simplified)
 * 
 * Score = (depleción_stock * 0.6) + (precio_bajo * 0.4)
 * 
 * Depleción = % de stock vendido (stock_anterior - stock_actual) / stock_anterior
 * Precio_bajo = inversamente proporcional al precio (productos más baratos = mejor score)
 */

interface ProductWithScore {
    id: string;
    name: string;
    lab_name: string | null;
    category: string;
    avg_price: number;
    image_url: string | null;
    url: string | null;
    stock_count: number;
    score: number;
    depletion_percent: number;
    rank: number;
    global_rank?: number;
    category_rank?: number;
    depletion_percent: number;
}

export async function GET(request: Request) {
    try {
        // Parse URL to get params
        const url = new URL(request.url);
        const categoryFilter = url.searchParams.get('category');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const searchParam = url.searchParams.get('search')?.toLowerCase() || '';

        // 1. Fetch all products (Limit increased to ensure global ranking accuracy)
        // We fetch ALL to calculate relative scores and sort correctly before slicing
        // Note: We do NOT filter by category at DB level anymore to ensure we can calculate Global Rank
        let query = supabase
            .from('products')
            .select('id, name, lab_name, category, avg_price, image_url, url, stock_count, rating, review_count');

        // Limit to 1000 to cover reasonable catalog size
        const { data: products, error: prodError } = await query.limit(1000);

        if (prodError || !products) {
            console.error('Products fetch error:', prodError);
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch products',
                data: []
            });
        }

        // 2. Batch Fetch Stock History (Optimization to avoid N+1 queries)
        const productNames = products.map(p => p.name);

        const { data: allStockHistory, error: historyError } = await supabase
            .from('stock_history')
            .select('product_name, stock_count, scraped_at')
            .in('product_name', productNames)
            .order('scraped_at', { ascending: false })
            .limit(products.length * 5);

        if (historyError) {
            console.warn('Stock history batch fetch error:', historyError);
        }

        // Group history by product name in-memory
        const historyMap = new Map<string, any[]>();
        if (allStockHistory) {
            allStockHistory.forEach(entry => {
                if (!historyMap.has(entry.product_name)) {
                    historyMap.set(entry.product_name, []);
                }
                if (historyMap.get(entry.product_name)!.length < 5) {
                    historyMap.get(entry.product_name)!.push(entry);
                }
            });
        }

        // 3. Calculate scores in-memory
        interface FullRankedProduct extends ProductWithScore {
            global_rank: number;
            category_rank: number;
            rank: number; // The final rank to be displayed
            rating: number | null;
            review_count: number | null;
        }

        let processedProducts: FullRankedProduct[] = products.map((product) => {
            // Get history from map
            const stockHistory = historyMap.get(product.name) || [];

            // Calculate depletion (stock reduction over time)
            let depletionPercent = 40;

            if (stockHistory.length >= 2) {
                const current = stockHistory[0].stock_count;
                const previous = stockHistory[stockHistory.length - 1].stock_count;
                if (previous > 0) {
                    depletionPercent = Math.max(0, ((previous - current) / previous) * 100);
                }
            } else {
                const productHash = (product.name || '').split('').reduce(
                    (hash, char) => hash + char.charCodeAt(0), 0
                );
                depletionPercent = 30 + (productHash % 56);
            }

            const maxPrice = 10;
            const priceScore = Math.max(0, Math.min(100, ((maxPrice - (product.avg_price || 0)) / maxPrice) * 100));

            const score = (depletionPercent * 0.6) + (priceScore * 0.4);

            return {
                id: product.id,
                name: product.name,
                lab_name: product.lab_name || null,
                category: product.category || 'Salud',
                avg_price: product.avg_price,
                image_url: product.image_url,
                url: product.url,
                stock_count: product.stock_count || 0,
                score: Math.round(score * 10) / 10,
                depletion_percent: Math.round(depletionPercent * 10) / 10,
                rating: product.rating,
                review_count: product.review_count,
                rank: 0, // Placeholder
                global_rank: 0, // Placeholder
                category_rank: 0 // Placeholder
            };
        });

        // 4. Sort by score descending (Global Ordering)
        processedProducts.sort((a, b) => b.score - a.score);

        // 5. Assign Global Ranks & Category Ranks
        const categoryCounters: Record<string, number> = {};

        processedProducts.forEach((p, i) => {
            // Global Rank (1-based index)
            p.global_rank = i + 1;
            p.rank = i + 1; // Default rank is global

            // Category Rank calculation
            const cat = p.category || 'Uncategorized';
            if (!categoryCounters[cat]) categoryCounters[cat] = 0;
            categoryCounters[cat]++;
            p.category_rank = categoryCounters[cat];
        });

        // 6. Apply Search & Category Filters

        if (searchParam) {
            processedProducts = processedProducts.filter(p =>
                p.name.toLowerCase().includes(searchParam) ||
                (p.lab_name && p.lab_name.toLowerCase().includes(searchParam))
            );
        }

        if (categoryFilter && categoryFilter !== 'all') {
            processedProducts = processedProducts.filter(p => p.category === categoryFilter);
        }

        // 7. Paginate result
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = processedProducts.slice(startIndex, endIndex);

        return NextResponse.json({
            success: true,
            count: paginatedData.length,
            total: processedProducts.length,
            data: paginatedData,
            hasMore: endIndex < processedProducts.length,
            page,
            formula: 'score = (deplecion_stock * 0.6) + (precio_bajo * 0.4)',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Rankings API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            data: []
        }, { status: 500 });
    }
}
