import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Environment variables are required
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');

    if (!productId) {
        return NextResponse.json({ error: 'Missing productId parameter' }, { status: 400 });
    }

    try {
        console.log(`🗺️ Fetching geo stock for product: ${productId}`);

        // 1. Fetch ALL stores to ensure we show every location (even those with 0 stock/no record)
        const { data: stores, error: storesError } = await supabase
            .from('sucursales')
            .select('id, name, lat, lng, city, address');

        if (storesError) {
            console.error('Error fetching stores:', storesError);
            throw new Error(storesError.message);
        }

        // 2. Fetch inventory for this product
        // We select sucursal_id to map back to the store list
        const { data: inventory, error: inventoryError } = await supabase
            .from('store_inventory')
            .select('quantity, sucursal_id')
            .eq('product_id', productId);

        if (inventoryError) {
            console.error('Error fetching inventory:', inventoryError);
            throw new Error(inventoryError.message);
        }

        // 3. Merge Data (Software-side Left Join)
        // Create a map of inventory by sucursal_id for O(1) lookup
        const inventoryMap = new Map();
        inventory?.forEach((item: any) => {
            inventoryMap.set(item.sucursal_id, item.quantity);
        });

        const locations = stores?.map(store => {
            const stock = inventoryMap.get(store.id) ?? 0; // Default to 0 if not found in inventory

            return {
                id: store.id,
                name: store.name,
                lat: store.lat,
                lng: store.lng,
                city: store.city,
                address: store.address,
                stock: stock
            };
        }).filter(loc => loc.lat && loc.lng) || []; // Ensure valid coordinates

        return NextResponse.json({
            locations: locations || [],
            meta: {
                total_stores: locations?.length || 0,
                total_stock: locations?.reduce((acc, curr) => acc + (curr?.stock || 0), 0) || 0
            }
        });

    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
