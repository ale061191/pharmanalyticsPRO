
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { ALGOLIA_CONFIG } from '../src/lib/algoliaClient';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

async function forceRepair() {
    console.log('Starting Aggressive Name Repair for Stubborn Items...');

    // We will iterate through commonly problematic brands or just do a general scan 
    // for where name == brand exactly.
    // To be efficient, let's search specifically for the ones the user complained about first
    // and then do a broader sweep if needed.

    const TARGET_BAD_NAMES = ['JL Pharma', 'Spervend', 'Bio-Mercy', 'N/A', 'Genérico', 'Biotech', 'Calox', 'Leti'];

    const indexUrl = `https://${ALGOLIA_CONFIG.appId}-dsn.algolia.net/1/indexes/${ALGOLIA_CONFIG.index}/query`;

    for (const badName of TARGET_BAD_NAMES) {
        console.log(`\nAggressively fixing items named exactly "${badName}"...`);
        let page = 0;

        while (true) {
            const response = await fetch(indexUrl, {
                method: 'POST',
                headers: {
                    'X-Algolia-Application-Id': ALGOLIA_CONFIG.appId,
                    'X-Algolia-API-Key': ALGOLIA_CONFIG.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: badName, // Search for the bad name
                    page,
                    hitsPerPage: 100
                }),
            });

            const data: any = await response.json();
            const hits = data.hits;
            if (!hits || hits.length === 0) break;

            for (const hit of hits) {
                const currentName = hit.description || hit.name || '';
                const brand = hit.brand || 'N/A';

                // STRICT CHECK: Is the name basically just the brand?
                // This captures "JL Pharma" name with "JL Pharma" brand.
                const isBroken =
                    currentName.trim().toLowerCase() === badName.toLowerCase() ||
                    currentName.trim().toLowerCase() === brand.trim().toLowerCase();

                if (isBroken) {
                    let betterName = '';

                    // Strategy: URL Slug is often the most reliable "real" name when data is this dirty
                    if (hit.url) {
                        try {
                            // url example: .../producto/12345/nombre-real-del-producto
                            const parts = hit.url.split('/').filter(p => p.length > 0);
                            let slug = parts[parts.length - 1];

                            // If slug is just an ID, take previous
                            if (!isNaN(Number(slug))) slug = parts[parts.length - 2];

                            if (slug) {
                                // Remove ID prefix if present (e.g. 112233-acetaminofen)
                                const slugParts = slug.split('-');
                                if (slugParts.length > 0 && !isNaN(Number(slugParts[0]))) {
                                    slugParts.shift();
                                }
                                betterName = toTitleCase(slugParts.join(' '));
                            }
                        } catch (e) { }
                    }

                    if (!betterName && hit.metatituloSEO) {
                        betterName = hit.metatituloSEO.split('|')[0].split('-')[0].trim();
                    }

                    if (betterName && betterName.length > 3 && betterName.toLowerCase() !== badName.toLowerCase()) {
                        console.log(`Fixing: "${currentName}" -> "${betterName}"`);

                        // Upsert logic (finding the product by URL primarily)
                        let cleanUrl = hit.url || '';
                        if (cleanUrl.startsWith('http')) {
                            try { const u = new URL(cleanUrl); cleanUrl = u.pathname; } catch (e) { }
                        }
                        if (!cleanUrl) cleanUrl = `/producto/${hit.objectID}`;

                        await supabase
                            .from('products')
                            .update({ name: betterName })
                            .eq('url', cleanUrl);
                    }
                }
            }

            if (page >= data.nbPages - 1) break;
            page++;
        }
    }
    console.log('\nAggressive Repair Complete.');
}

forceRepair();
