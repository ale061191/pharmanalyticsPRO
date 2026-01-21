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

    console.log("----------------------------------------------------------------");
    console.log(`[Hybrid API] Request Recieved`);
    console.log(`[Hybrid API] product_id param: '${productId}'`);
    console.log(`[Hybrid API] product_name param: '${productName}'`);
    console.log(`[Hybrid API] Using target ID: '${productId || 'will-lookup-by-name'}'`);
    console.log("----------------------------------------------------------------");

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
        // LAYER 2: STORE INVENTORY (Real-time Granular)
        // ============================================
        console.log(`[Hybrid] Layer 2: Checking store_inventory for ${identifier}`);

        let targetProductId = productId;

        // If we only have name, we need to resolve it to an ID first
        if (!targetProductId && productName) {
            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id')
                .ilike('name', `%${productName.trim()}%`) // Exact match or close enough
                .limit(1)
                .single();

            if (productData) {
                targetProductId = productData.id;
            } else {
                console.log(`[Hybrid] Product ID not found for name: ${productName}`);
            }
        }

        if (targetProductId) {
            // STEP 1: Fetch ALL stores (to ensure we don't miss 0-stock ones)
            const { data: allStores, error: storesError } = await supabase
                .from('sucursales')
                .select('id, name, city, address, lat, lng');

            if (storesError || !allStores) {
                throw new Error(`Failed to fetch stores: ${storesError?.message}`);
            }

            // STEP 2: Fetch Inventory for this product
            const { data: inventoryData, error: inventoryError } = await supabase
                .from('store_inventory')
                .select('quantity, sucursal_id')
                .eq('product_id', targetProductId);

            if (!inventoryError && allStores.length > 0) {
                // Create a Map for O(1) inventory lookup
                const inventoryMap = new Map();
                inventoryData?.forEach((item: any) => {
                    inventoryMap.set(item.sucursal_id, item.quantity);
                });

                console.log(`[Hybrid] Merging ${allStores.length} stores with ${inventoryData?.length || 0} inventory records`);

                // Group by city > sector > store
                const citiesMap: Record<string, {
                    city: string;
                    sectors: {
                        sector: string;
                        stores: {
                            name: string;
                            address: string;
                            stock_count: number;
                            availability_status: string;
                        }[];
                    }[];
                    total_stock: number;
                }> = {};

                for (const store of allStores) {
                    const stock = inventoryMap.get(store.id) || 0;
                    const cityName = store.city || 'Desconocido';
                    const sectorName = 'General';

                    if (!citiesMap[cityName]) {
                        citiesMap[cityName] = { city: cityName, sectors: [], total_stock: 0 };
                    }

                    let sector = citiesMap[cityName].sectors.find(s => s.sector === sectorName);
                    if (!sector) {
                        sector = { sector: sectorName, stores: [] };
                        citiesMap[cityName].sectors.push(sector);
                    }

                    sector.stores.push({
                        name: store.name,
                        address: store.address || '',
                        stock_count: stock,
                        availability_status: stock > 10 ? 'high' : (stock > 0 ? 'medium' : 'low')
                    });

                    citiesMap[cityName].total_stock += stock;
                }

                // If no product name yet, try to set it
                if (!response.product_name && productName) {
                    response.product_name = productName;
                }

                response.detail = {
                    stores: [],
                    cities: Object.values(citiesMap) as any,
                    source: 'cache',
                    cache_age_hours: 0,
                };

                return NextResponse.json(response);
            } else {
                console.log(`[Hybrid] Error fetching inventory. Error: ${inventoryError?.message}`);
                // DEBUG RESPONSE
                return NextResponse.json({
                    ...response,
                    debug_info: {
                        stage: 'inventory_fetch',
                        target_product_id: targetProductId,
                        db_error: inventoryError,
                    }
                });
            }
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
