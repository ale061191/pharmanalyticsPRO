import { createClient } from '@supabase/supabase-js';
import algoliasearch from 'algoliasearch';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using Anon key for client-side operations (or Service Role if available for updates)
// Ideally we need Service Role for updates if RLS is strict, but let's try with what we have or checking if we have a service key in env. 
// Checking .env previously showed only ANON_KEY. If RLS blocks updates, we might need to handle that. 
// Assuming current env allows updates or we are using a user context.
// Actually, for a script, we usually need a SERVICE_ROLE_KEY if RLS is on.
// Let's check for SERVICE_KEY in .env.local via code first? No, we saw the file content in Step 996. Only ANON_KEY is there.
// If RLS is enabled, ANON_KEY might not allow updates to 'products' without a session.
// However, I will write the script to try. If it fails, I'll ask for the service key or use a different method.
// WAIT: The user has `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
// I'll proceed with this.

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID_VEN!;
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY_VEN!;
const ALGOLIA_INDEX_NAME = 'products-venezuela';

if (!SUPABASE_URL || !SUPABASE_KEY || !ALGOLIA_APP_ID || !ALGOLIA_API_KEY) {
    console.error('Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

async function updateImages() {
    console.log('Starting image update process...');

    // 1. Fetch products without images from Supabase
    // Fetching in chunks to avoid memory issues if expected count is large
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('department', 'Salud y Medicamentos')
        .is('image_url', null); // Or check for empty string if needed: .or('image_url.is.null,image_url.eq.""')

    if (error) {
        console.error('Error fetching products from Supabase:', error);
        return;
    }

    if (!products || products.length === 0) {
        console.log('No products found needing image updates.');
        return;
    }

    console.log(`Found ${products.length} products to check.`);

    let updatedCount = 0;
    let errorsCount = 0;
    const batchSize = 100; // Algolia recommends batching queries, but we are querying by ID usually.
    // Actually, getObjects with objectIDs is efficient.

    // We can use individual lookups or `getObjects` if we map our DB IDs to Algolia ObjectIDs.
    // In the check script, `product.id` in Algolia matched our DB IDs (e.g., "112923361").
    // So we can assume Supabase ID === Algolia ObjectID.

    for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        const objectIDs = batch.map(p => p.id); // Assuming DB ID matches Algolia objectID

        try {
            // Use getObjects to fetch specific items (more efficient than search)
            const { results } = await index.getObjects(objectIDs, {
                attributesToRetrieve: ['mediaImageUrl', 'listUrlImages', 'image', 'thumbnail']
            });

            const updates = [];

            for (let j = 0; j < results.length; j++) {
                const algoliaProduct: any = results[j];
                if (!algoliaProduct) continue;

                // Determine best image URL
                let imageUrl = algoliaProduct.mediaImageUrl;

                if (!imageUrl && algoliaProduct.listUrlImages && Array.isArray(algoliaProduct.listUrlImages) && algoliaProduct.listUrlImages.length > 0) {
                    imageUrl = algoliaProduct.listUrlImages[0];
                }

                if (imageUrl) {
                    const dbProduct = batch[j];
                    updates.push({
                        id: dbProduct.id,
                        image_url: imageUrl
                    });
                }
            }

            // Perform updates in Supabase
            // Supabase JS doesn't have a bulk update for different values in one query easily without UPSERT.
            // We process updates individually or use upsert if schema allows.
            // Upsert requires all required columns or default values. updating just one column via upsert is tricky if others are non-nullable and not provided.
            // Update is safer.

            const updatePromises = updates.map(update =>
                supabase
                    .from('products')
                    .update({ image_url: update.image_url })
                    .eq('id', update.id)
            );

            await Promise.all(updatePromises);

            updatedCount += updates.length;
            process.stdout.write(`\rProcessed: ${Math.min(i + batchSize, products.length)}/${products.length} | Updated: ${updatedCount}`);

        } catch (err) {
            console.error(`\nError processing batch ${i}:`, err);
            errorsCount++;
        }
    }

    console.log(`\n\nFinished! Total Updated: ${updatedCount}. Batches defined with errors: ${errorsCount}`);
}

updateImages();
