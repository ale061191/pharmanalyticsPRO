
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { ALGOLIA_CONFIG } from '../src/lib/algoliaClient';

// Load env vars
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function cleanProductData(hit: any) {
    let name = hit.description || hit.name || '';
    const brand = hit.brand || 'N/A';

    // Heuristic: If name is very short or identical to brand
    const isSuspicious =
        name.trim().toLowerCase() === brand.trim().toLowerCase() ||
        name.length < 3 ||
        (brand !== 'N/A' && name.includes(brand) && name.length < brand.length + 5);

    if (isSuspicious) {
        // Strategy 1: Meta Title SEO
        if (hit.metatituloSEO && hit.metatituloSEO.length > name.length) {
            name = hit.metatituloSEO.replace(' | Farmatodo', '').replace(' - Farmatodo', '').trim();
        }
        // Strategy 2: URL Slug (Backup)
        else if (hit.url) {
            try {
                // url: https://.../producto/12345/nombre-del-producto
                const parts = hit.url.split('/');
                let slug = parts[parts.length - 1]; // "nombre-del-producto" or "12345-nombre..."
                if (!slug) slug = parts[parts.length - 2]; // handle trailing slash

                if (slug) {
                    // Remove potential leading ID
                    const slugParts = slug.split('-');
                    if (slugParts.length > 0 && !isNaN(Number(slugParts[0]))) {
                        slugParts.shift();
                    }
                    if (slugParts.length > 0) {
                        name = toTitleCase(slugParts.join(' '));
                    }
                }
            } catch (e) { }
        }
    }

    // Heuristic 2: Remove leading numbers if name starts with them (common Algolia dirty data)
    // E.g. "123456 Acetaminofen" -> "Acetaminofen"
    name = name.replace(/^\d+\s+/, '');

    return name;
}

async function repairNames() {
    console.log('Starting Targeted Name Repair...');
    const indexUrl = `https://${ALGOLIA_CONFIG.appId}-dsn.algolia.net/1/indexes/${ALGOLIA_CONFIG.index}/query`;
    const prefixes = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    prefixes.unshift('');

    let fixedCount = 0;

    for (const prefix of prefixes) {
        let page = 0;
        while (true) {
            try {
                const response = await fetch(indexUrl, {
                    method: 'POST',
                    headers: {
                        'X-Algolia-Application-Id': ALGOLIA_CONFIG.appId,
                        'X-Algolia-API-Key': ALGOLIA_CONFIG.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: prefix, page, hitsPerPage: 100 }),
                });

                if (!response.ok) break;
                const data: any = await response.json();
                const hits = data.hits;
                if (!hits || hits.length === 0) break;

                for (const hit of hits) {
                    const originalName = hit.description || hit.name || '';
                    const betterName = cleanProductData(hit);

                    // If we found a significantly different/better name
                    if (betterName && betterName !== originalName && betterName.length > 3) {
                        // console.log(`Repaired: "${originalName}" -> "${betterName}"`);

                        // Upsert logic (finding the product by URL primarily)
                        let cleanUrl = hit.url || '';
                        if (cleanUrl.startsWith('http')) {
                            try { const u = new URL(cleanUrl); cleanUrl = u.pathname; } catch (e) { }
                        }
                        if (!cleanUrl) cleanUrl = `/producto/${hit.objectID}`;

                        const { error } = await supabase
                            .from('products')
                            .update({ name: betterName })
                            .eq('url', cleanUrl);

                        if (!error) fixedCount++;
                    }
                }

                if (page >= data.nbPages - 1) break;
                page++;
            } catch (e) {
                console.error(e);
                break;
            }
        }
        process.stdout.write('.');
    }

    console.log(`\n\n=== Repair Complete ===`);
    console.log(`Fixed Names: ${fixedCount}`);
}

repairNames();
