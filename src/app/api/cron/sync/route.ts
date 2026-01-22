import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import algoliasearch from 'algoliasearch';
import { normalizeAlgoliaProduct } from '@/lib/priceNormalizer';

// Configuration (Mirroring automated_sync.js)
const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

// Initialize Supabase Client (Service Role verified needed for bulk upserts usually, but existing scripts check Env)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Algolia
const algoliaClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = algoliaClient.initIndex(ALGOLIA_CONFIG.indexName);

export const maxDuration = 300; // 5 minutes max for Vercel functions (Pro plan)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('🔄 Cron Start: Syncing products...');
        const products: any[] = [];

        // 2. Fetch all products from Algolia
        await index.browseObjects({
            batch: (batch) => {
                // Determine source for logging
                const normalizedBatch = batch.map((hit: any) => normalizeAlgoliaProduct(hit));
                products.push(...normalizedBatch);
            },
            attributesToRetrieve: [
                'objectID', 'id', 'description', 'mediaDescription', 'name',
                'fullPrice', 'offerPrice', 'imageUrl', 'mediaImageUrl', 'url',
                'totalStock', 'stock', 'rating', 'reviewCount', 'reviews',
                'presentation', 'marca', 'brand', 'categorie', 'category'
            ]
        });

        if (products.length === 0) {
            return NextResponse.json({ message: 'No products found in Algolia' }, { status: 200 });
        }

        console.log(`📦 Fetched ${products.length} products. Syncing to Supabase...`);

        // 3. Upsert to Supabase in batches of 100
        let inserted = 0;
        let errors = 0;
        const BATCH_SIZE = 100;

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);

            // Map to DB columns
            const dbBatch = batch.map(p => ({
                id: p.id,
                nombre: p.name,
                laboratorio: p.lab_name || 'Desconocido',
                categoria: p.category,
                precio_bs: p.avg_price, // Using normalized avg_price
                imagen_url: p.image_url,
                stock: p.stock_count, // Important for stock sync
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('products') // Assuming table name is 'products'? Check automated_sync.js
                .upsert(dbBatch, { onConflict: 'id', ignoreDuplicates: false });

            if (error) {
                console.error(`❌ Batch error: ${error.message}`);
                errors += batch.length;
            } else {
                inserted += batch.length;
            }
        }

        console.log(`✅ Cron Sync Complete: ${inserted} updated, ${errors} failed.`);

        return NextResponse.json({
            success: true,
            fetched: products.length,
            inserted,
            errors,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('🔥 Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
