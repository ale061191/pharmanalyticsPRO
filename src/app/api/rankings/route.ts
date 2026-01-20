
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

function cleanProductName(name: string | null): string {
    if (!name) return 'Producto';
    return name.replace(/^[!\/]+\s*/, '').trim();
}

function extractLabFromName(name: string): string | null {
    const INVALID_LABS = new Set([
        'tab', 'tabs', 'tabletas', 'tableta', 'gr', 'gramos', 'g', 'ml', 'mililitros',
        'mg', 'miligramos', 'cap', 'capsulas', 'capsula', 'und', 'unidades', 'unidad',
        'sobres', 'sobre', 'crema', 'jarabe', 'gotas', 'spray', 'caja', 'frasco', 'tubo', 'blister'
    ]);
    if (/\d{4}[A-Z]-\d+/.test(name)) return null;
    const patterns = [/\s([A-Z][a-z]+)$/, /\s-\s([A-Za-z\s]+)$/];
    for (const pattern of patterns) {
        const match = name.match(pattern);
        if (match && match[1] && match[1].length > 1) {
            const extracted = match[1].trim().toLowerCase();
            if (!INVALID_LABS.has(extracted)) return match[1].trim();
        }
    }
    return null;
}

interface ProductWithScore {
    id: string;
    name: string;
    brand: string | null;
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
    presentation?: string | null;
    original_price?: number;
}

export async function GET(request: Request) {
    console.log("🚀 API /api/rankings INVOKED");
    try {
        const url = new URL(request.url);
        const categoryFilter = url.searchParams.get('category');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const searchParam = url.searchParams.get('search')?.toLowerCase() || '';

        // 2. Fetch Rankings using RPC for Global Sorting by Growth
        const { data: rankedProducts, error: rpcError } = await supabase
            .rpc('get_top_healthy_products', {
                cat_name: (categoryFilter && categoryFilter !== 'Todos' && categoryFilter !== 'all') ? categoryFilter : '',
                limit_count: limit
            });

        if (rpcError) {
            console.error("❌ RPC Error:", rpcError);
            throw rpcError;
        }

        if (!rankedProducts) {
            return NextResponse.json({ success: true, data: [], count: 0 });
        }

        // 3. Transform for Frontend
        let processedProducts = rankedProducts.map((product: any) => {
            const stockHistory = product.history || [];
            const maxStock = stockHistory.length > 0
                ? Math.max(...stockHistory.map((h: any) => h.value))
                : 0;

            return {
                id: product.id,
                name: cleanProductName(product.name),
                brand: product.brand || extractLabFromName(product.name || '') || null,
                lab_name: product.brand || extractLabFromName(product.name || '') || null,
                category: product.category || 'Salud',
                avg_price: 0,
                original_price: 0,
                image_url: product.image_url || null,
                score: Number(product.health_score) || 0,
                weekly_diff: Number(product.weekly_diff) || 0,
                history: stockHistory.map((h: any) => ({
                    date: h.date,
                    value: Math.max(0, maxStock - h.value) // Invert: rises as stock depletes
                }))
            };
        });

        return NextResponse.json({
            success: true,
            count: processedProducts.length,
            total: processedProducts.length,
            hasMore: false,
            data: processedProducts,
            page
        });

    } catch (error: any) {
        console.error('🔥 API CRITICAL FATAL:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown Server Error',
            data: []
        }, { status: 500 });
    }
}
