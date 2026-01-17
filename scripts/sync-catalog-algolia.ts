
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { ALGOLIA_CONFIG } from '../src/lib/algoliaClient';

// Load env vars
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface AlgoliaHit {
    objectID: string;
    description: string;
    name?: string;
    brand?: string;
    price: number;
    fullPrice?: number;
    offerPrice?: number;
    unitPrice?: number;
    url?: string;
    category?: string;
    hierarchicalCategories?: {
        lvl0?: string;
        lvl1?: string;
    };
    image?: string;
    thumbnail?: string;
}

async function fetchAllAlgoliaProducts() {
    console.log('Starting full catalog sync from Algolia (Merge by URL or Name)...');
    const indexUrl = `https://${ALGOLIA_CONFIG.appId}-dsn.algolia.net/1/indexes/${ALGOLIA_CONFIG.index}/query`;

    // Prefixes to iterate
    const prefixes = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    prefixes.unshift('');

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalInserted = 0;
    let errors = 0;

    for (const prefix of prefixes) {
        console.log(`\n--- Processing prefix: "${prefix}" ---`);

        let page = 0;
        let prefixHits = 0;

        while (true) {
            try {
                const response = await fetch(indexUrl, {
                    method: 'POST',
                    headers: {
                        'X-Algolia-Application-Id': ALGOLIA_CONFIG.appId,
                        'X-Algolia-API-Key': ALGOLIA_CONFIG.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: prefix,
                        page: page,
                        hitsPerPage: 100
                    }),
                });

                if (!response.ok) {
                    if (response.status === 400 && page > 0) break;
                    console.error(`Algolia search failed for prefix "${prefix}" page ${page}: ${response.status}`);
                    break;
                }

                const data: any = await response.json();
                const hits: AlgoliaHit[] = data.hits;

                if (hits.length === 0) break;

                // Process hits one by one
                for (const hit of hits) {
                    const productName = hit.description || hit.name || 'Unknown Product';

                    // Price Logic
                    const rawPrice = Number(hit.price);
                    const offerPrice = Number(hit.offerPrice || 0);
                    const fullPrice = Number(hit.fullPrice || 0);

                    let finalPrice = rawPrice;
                    if (offerPrice > 0) finalPrice = offerPrice;

                    let originalPrice = fullPrice;
                    if (originalPrice === 0 || originalPrice < finalPrice) {
                        originalPrice = finalPrice;
                    }

                    // Normalize URL
                    let cleanUrl = hit.url || '';
                    if (cleanUrl.startsWith('http')) {
                        try {
                            const u = new URL(cleanUrl);
                            cleanUrl = u.pathname;
                        } catch (e) { }
                    }
                    if (!cleanUrl) {
                        cleanUrl = `/producto/${hit.objectID}`;
                    }

                    // 1. Check by URL
                    let { data: existing, error: findError } = await supabase
                        .from('products')
                        .select('id')
                        .eq('url', cleanUrl)
                        .maybeSingle();

                    if (findError) {
                        // ignore
                    }

                    // 2. If not found by URL, check by NAME
                    if (!existing && productName) {
                        const { data: existingByName } = await supabase
                            .from('products')
                            .select('id')
                            .eq('name', productName)
                            .maybeSingle();

                        if (existingByName) {
                            existing = existingByName;
                            // console.log(`Matched by name: ${productName}`);
                        }
                    }

                    const productData = {
                        name: productName,
                        lab_name: hit.brand || 'N/A',
                        avg_price: finalPrice,
                        original_price: originalPrice,
                        category: hit.category || (hit.hierarchicalCategories?.lvl0?.split('>').pop()?.trim()) || 'Salud',
                        updated_at: new Date().toISOString(),
                        url: cleanUrl,
                        image_url: hit.image || hit.thumbnail
                    };

                    if (existing) {
                        // UPDATE
                        const { error: updateError } = await supabase
                            .from('products')
                            .update(productData)
                            .eq('id', existing.id);

                        if (updateError) {
                            console.error(`Update error for ${productName}:`, updateError.message);
                            errors++;
                        } else {
                            totalUpdated++;
                        }
                    } else {
                        // INSERT
                        const { error: insertError } = await supabase
                            .from('products')
                            .insert(productData);

                        if (insertError) {
                            console.error(`Insert error for ${productName}:`, insertError.message);
                            errors++;
                        } else {
                            totalInserted++;
                        }
                    }
                }

                totalProcessed += hits.length;
                prefixHits += hits.length;

                if (page >= data.nbPages - 1) break;
                page++;

                await new Promise(r => setTimeout(r, 50));

            } catch (e) {
                console.error('Error in sync loop:', e);
                break;
            }
        }
        console.log(`Finished prefix "${prefix}": ${prefixHits} hits.`);
    }

    console.log(`\n=== Sync Complete ===`);
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Updated: ${totalUpdated}`);
    console.log(`Inserted: ${totalInserted}`);
    console.log(`Errors: ${errors}`);
}

fetchAllAlgoliaProducts();
