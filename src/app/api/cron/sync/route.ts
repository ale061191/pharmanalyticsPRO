import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import algoliasearch from 'algoliasearch';
import { normalizeAlgoliaProduct } from '@/lib/priceNormalizer';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuration
const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini Setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const algoliaClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = algoliaClient.initIndex(ALGOLIA_CONFIG.indexName);

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('🔄 Cron Start: Syncing products with AI...');
        const products: any[] = [];

        // 2. Fetch all products from Algolia
        await index.browseObjects({
            batch: (batch) => {
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

        // 3. Upsert to Supabase in batches of 50 (smaller batch for AI safety)
        let inserted = 0;
        let errors = 0;
        let aiCleanedCount = 0;
        const BATCH_SIZE = 50;

        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);
            const batchIds = batch.map(p => p.id);

            // A. Check which products exist and are clean
            const { data: existingRows } = await supabase
                .from('products')
                .select('id, clean_name, atc_code')
                .in('id', batchIds);

            const existingMap = new Map(existingRows?.map(r => [r.id, r]));

            // B. Identify Dirty Products
            const dirtyProducts = batch.filter(p => {
                const existing = existingMap.get(p.id);
                // Clean if NEW or if Clean Name is missing
                return !existing || !existing.clean_name;
            });

            let aiResultsMap = new Map();

            // C. Run AI cleaning on dirty products (if any)
            if (dirtyProducts.length > 0) {
                console.log(`✨ Cleaning ${dirtyProducts.length} products with Gemini...`);
                try {
                    const cleanedData = await cleanWithGemini(dirtyProducts);
                    cleanedData.forEach((item: any) => aiResultsMap.set(item.id, item));
                    aiCleanedCount += cleanedData.length;
                } catch (err) {
                    console.error("⚠️ AI Cleaning failed for batch, skipping AI update:", err);
                    // Continue with raw data upsert (don't fail the sync)
                }
            }

            // D. Prepare Payload
            const dbBatch = batch.map(p => {
                const aiData = aiResultsMap.get(p.id);

                return {
                    id: p.id,
                    nombre: p.name, // Original name always
                    laboratorio: p.lab_name || 'Desconocido',
                    categoria: p.category,
                    precio_bs: p.avg_price,
                    imagen_url: p.image_url,
                    stock: p.stock_count,
                    updated_at: new Date().toISOString(),
                    // Optional fields (Merge AI data if available)
                    ...(aiData?.clean_name && { clean_name: aiData.clean_name }),
                    ...(aiData?.atc_code && { atc_code: aiData.atc_code }),
                    ...(aiData?.active_ingredient && { active_ingredient: aiData.active_ingredient }),
                    ...(aiData?.presentation && { presentation: aiData.presentation }),
                    // Brand override from AI if detected
                    ...(aiData?.laboratory && { brand: aiData.laboratory }),
                };
            });

            // E. Upsert
            const { error } = await supabase
                .from('products')
                .upsert(dbBatch, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Batch error: ${error.message}`);
                errors += batch.length;
            } else {
                inserted += batch.length;
            }
        }

        console.log(`✅ Cron Sync Complete: ${inserted} updated, ${aiCleanedCount} cleaned via AI, ${errors} failed.`);

        return NextResponse.json({
            success: true,
            fetched: products.length,
            inserted,
            ai_cleaned: aiCleanedCount,
            errors,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('🔥 Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// AI Cleaning Helper
async function cleanWithGemini(batch: any[]) {
    // Simplify payload for tokens
    const simplified = batch.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category
    }));

    const prompt = `
    Clean pharmaceutical product names. Remove dosages like "500mg", "x 10", "Caja", etc. to get the pure brand/generic name.
    Assign ATC code (who/mediately) if sure (prefer 5th level). If unsure, null.
    Extract active ingredient, presentation, concentration, and laboratory.
    
    INPUT: ${JSON.stringify(simplified)}

    OUTPUT: JSON Array of objects:
    [{ "id": "...", "clean_name": "Atamel", "atc_code": "N02BE01", "active_ingredient": "Paracetamol", "presentation": "Tabletas", "concentration": "500 mg", "laboratory": "Pfizer" }]
    Raw JSON only.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
}
