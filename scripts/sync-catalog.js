
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Hardcoded keys from algoliaClient.ts
const ALGOLIA_APP_ID = 'VCOJEYD2PO';
const ALGOLIA_API_KEY = '869a91e98550dd668b8b1dc04bca9011';
const ALGOLIA_INDEX = 'products-venezuela';

async function fetchAll() {
    console.log('--- Starting CJS Sync ---');
    const indexUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

    // Prefixes
    const prefixes = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    prefixes.unshift(''); // top hits

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalInserted = 0;
    let errors = 0;

    for (const prefix of prefixes) {
        process.stdout.write(`Prefix "${prefix}": `);
        let page = 0;
        let prefixHits = 0;

        while (true) {
            try {
                const response = await fetch(indexUrl, {
                    method: 'POST',
                    headers: {
                        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
                        'X-Algolia-API-Key': ALGOLIA_API_KEY,
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
                    console.error(`Status: ${response.status}`);
                    break;
                }

                const data = await response.json();
                const hits = data.hits;
                if (!hits || hits.length === 0) break;

                for (const hit of hits) {
                    // NAME CLEANING
                    let rawName = hit.description || hit.name || 'Unknown Product';
                    let cleanName = rawName.replace(/^Psi\s+/i, '').trim();
                    if (cleanName === 'N/A') cleanName = 'Unknown Product';

                    // PRICE LOGIC (Prioritize Offer > Price > Full)
                    const p1 = Number(hit.price || 0);
                    const p2 = Number(hit.offerPrice || 0);
                    const finalPrice = p2 > 0 ? p2 : p1;
                    const originalPrice = Number(hit.fullPrice || 0);

                    // LAB LOGIC (Brand Fallback)
                    const lab = hit.brand || hit.manufacturer || hit.laboratorio || 'N/A';

                    // RATING LOGIC
                    const rating = Number(hit.rating || hit.stars || 0);
                    const reviews = Number(hit.review_count || hit.reviews || 0);

                    // IMAGE LOGIC
                    const image = hit.image || hit.thumbnail || null;

                    // URL LOGIC
                    let cleanUrl = hit.url || '';
                    if (cleanUrl.startsWith('http')) {
                        try {
                            const u = new URL(cleanUrl);
                            cleanUrl = u.pathname;
                        } catch (e) { }
                    }
                    if (!cleanUrl) cleanUrl = `/producto/${hit.objectID}`;

                    const productData = {
                        name: cleanName,
                        lab_name: lab,
                        avg_price: finalPrice,
                        original_price: originalPrice,
                        rating: rating,
                        review_count: reviews,
                        category: hit.category || 'Salud',
                        updated_at: new Date().toISOString(),
                        url: cleanUrl,
                        image_url: image
                    };

                    // UPSERT by URL
                    let existingId = null;
                    const { data: existingUrl } = await supabase.from('products').select('id').eq('url', cleanUrl).maybeSingle();
                    if (existingUrl) existingId = existingUrl.id;
                    else {
                        const { data: existingName } = await supabase.from('products').select('id').eq('name', cleanName).maybeSingle();
                        if (existingName) existingId = existingName.id;
                    }

                    if (existingId) {
                        const { error: upError } = await supabase.from('products').update(productData).eq('id', existingId);
                        if (upError) errors++; else totalUpdated++;
                    } else {
                        const { error: inError } = await supabase.from('products').insert(productData);
                        if (inError) errors++; else totalInserted++;
                    }
                }

                totalProcessed += hits.length;
                prefixHits += hits.length;
                if (page >= (data.nbPages || 0) - 1) break;
                page++;
                await new Promise(r => setTimeout(r, 20));

            } catch (e) {
                console.error(e);
                break;
            }
        }
        console.log(`${prefixHits} hits.`);
    }

    console.log(`\n=== DONE ===`);
    console.log(`Processed: ${totalProcessed}`);
    console.log(`Updated: ${totalUpdated}`);
    console.log(`Inserted: ${totalInserted}`);
    console.log(`Errors: ${errors}`);
}

fetchAll();
