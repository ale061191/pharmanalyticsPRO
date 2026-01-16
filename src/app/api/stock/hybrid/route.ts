/**
 * Hybrid Stock API Endpoint
 * 
 * 3-Layer Architecture:
 * 1. ALGOLIA (instant) - Always returns aggregated stock
 * 2. CACHE (fast) - Returns detailed stock if available from last 24h
 * 3. ON-DEMAND (slow) - Triggers scraping if no cache, returns in background
 * 
 * This ensures the customer ALWAYS gets data immediately.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getAggregateStock } from '@/lib/algoliaClient';

// Cache duration in hours
const CACHE_HOURS = 24;

interface StoreDetail {
    store_name: string;
    sector: string;
    city: string;
    stock_count: number;
    availability_status: string;
}

interface HybridResponse {
    success: boolean;
    product_name: string | null;

    // Layer 1: Algolia (always present)
    aggregate: {
        total_stock: number;
        stores_with_stock: number;
        avg_per_store: number;
        source: 'algolia';
    };

    // Layer 2/3: Detailed (from cache or pending)
    detail: {
        stores: StoreDetail[];
        cities: Record<string, number>;
        source: 'cache' | 'pending' | 'none';
        cache_age_hours?: number;
        scrape_triggered?: boolean;
    };

    timestamp: string;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const productName = searchParams.get('product_name');
    const productUrl = searchParams.get('product_url');
    const triggerScrape = searchParams.get('trigger_scrape') === 'true';

    if (!productId && !productName) {
        return NextResponse.json(
            { error: 'product_id or product_name is required' },
            { status: 400 }
        );
    }

    const identifier = productId || productName || '';

    try {
        // ============================================
        // LAYER 1: ALGOLIA (Always instant)
        // ============================================
        console.log(`[Hybrid] Layer 1: Fetching Algolia for ${identifier}`);

        const algoliaData = await getAggregateStock(identifier);

        const response: HybridResponse = {
            success: true,
            product_name: algoliaData.product_name,
            aggregate: {
                total_stock: algoliaData.total_stock,
                stores_with_stock: algoliaData.stores_with_stock,
                avg_per_store: algoliaData.avg_per_store,
                source: 'algolia',
            },
            detail: {
                stores: [],
                cities: {},
                source: 'none',
            },
            timestamp: new Date().toISOString(),
        };

        // ============================================
        // LAYER 2: CACHE (Check Supabase)
        // ============================================
        console.log(`[Hybrid] Layer 2: Checking cache for ${identifier}`);

        const cacheThreshold = new Date();
        cacheThreshold.setHours(cacheThreshold.getHours() - CACHE_HOURS);

        // Try to find cached data
        let query = supabase
            .from('stock_detail')
            .select('*')
            .gte('scraped_at', cacheThreshold.toISOString())
            .order('scraped_at', { ascending: false })
            .limit(200);

        // Match by product name (flexible)
        if (productName) {
            query = query.ilike('product_name', `%${productName.split(' ').slice(0, 3).join(' ')}%`);
        }

        const { data: cacheData, error: cacheError } = await query;

        if (!cacheError && cacheData && cacheData.length > 0) {
            // Cache hit! Process and return
            console.log(`[Hybrid] Cache HIT: ${cacheData.length} entries`);

            const stores: StoreDetail[] = [];
            const cities: Record<string, number> = {};

            for (const row of cacheData) {
                stores.push({
                    store_name: row.store_name,
                    sector: row.sector || 'General',
                    city: row.city,
                    stock_count: row.stock_count,
                    availability_status: row.availability_status || 'unknown',
                });

                if (!cities[row.city]) {
                    cities[row.city] = 0;
                }
                cities[row.city] += row.stock_count;
            }

            // Calculate cache age
            const oldestEntry = cacheData[cacheData.length - 1];
            const cacheAgeMs = Date.now() - new Date(oldestEntry.scraped_at).getTime();
            const cacheAgeHours = Math.round(cacheAgeMs / (1000 * 60 * 60) * 10) / 10;

            response.detail = {
                stores,
                cities,
                source: 'cache',
                cache_age_hours: cacheAgeHours,
            };

            // Update product name from cache if better
            if (!response.product_name && cacheData[0].product_name) {
                response.product_name = cacheData[0].product_name;
            }

            return NextResponse.json(response);
        }

        // ============================================
        // LAYER 3: NO CACHE - Trigger scrape if requested
        // ============================================
        console.log(`[Hybrid] Cache MISS - triggerScrape: ${triggerScrape}`);

        if (triggerScrape && productUrl) {
            // Queue scrape in background
            console.log(`[Hybrid] Triggering background scrape for ${productUrl}`);

            // Add to scrape queue (non-blocking)
            addToScrapeQueue(productUrl, productName || identifier).catch(console.error);

            response.detail = {
                stores: [],
                cities: {},
                source: 'pending',
                scrape_triggered: true,
            };
        } else {
            response.detail = {
                stores: [],
                cities: {},
                source: 'none',
                scrape_triggered: false,
            };
        }

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('[Hybrid] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                aggregate: { total_stock: 0, stores_with_stock: 0, avg_per_store: 0, source: 'algolia' },
                detail: { stores: [], cities: {}, source: 'none' },
            },
            { status: 500 }
        );
    }
}

/**
 * Add product to scrape queue (non-blocking)
 */
async function addToScrapeQueue(productUrl: string, productName: string): Promise<void> {
    try {
        // Check if already in queue
        const { data: existing } = await supabase
            .from('scrape_queue')
            .select('id')
            .eq('product_url', productUrl)
            .eq('status', 'pending')
            .single();

        if (existing) {
            console.log('[Hybrid] Product already in queue');
            return;
        }

        // Add to queue
        const { error } = await supabase
            .from('scrape_queue')
            .insert({
                product_url: productUrl,
                product_id: productUrl.match(/producto\/(\d+)/)?.[1] || productUrl,
                priority: 1, // High priority for on-demand
                status: 'pending',
                scheduled_for: new Date().toISOString(),
            });

        if (error) {
            console.error('[Hybrid] Queue insert error:', error);
        } else {
            console.log('[Hybrid] Added to scrape queue');
        }

    } catch (error) {
        console.error('[Hybrid] Queue error:', error);
    }
}

// POST endpoint to manually trigger scrape
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { product_url, product_name, priority = 2 } = body;

        if (!product_url) {
            return NextResponse.json({ error: 'product_url required' }, { status: 400 });
        }

        await addToScrapeQueue(product_url, product_name || '');

        return NextResponse.json({
            success: true,
            message: 'Product added to scrape queue',
            priority,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
