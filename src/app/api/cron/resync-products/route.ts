import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import algoliasearch from 'algoliasearch';

// Configuration
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const algoliaClient = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = algoliaClient.initIndex(ALGOLIA_CONFIG.indexName);

// Categories to scan
const CATEGORIES = [
    "Medicamentos",
    "Salud y Medicamentos",
    "Salud y medicamentos",
    "Salud Digestiva",
    "Alivio del dolor",
    "Dermatológicos",
    "Salud Respiratoria y Gripe",
    "Vitaminas y Productos Naturales",
    "Vitaminas y productos naturales",
    "Cuidado de la vista",
    "Cuidado De La Vista",
    "Botiquín y primeros auxilios",
    "Botiquín y Primeros Auxilios", // Case sensitive safety
    "Nutrición y vida saludable",
    "Atención y Equipos Médicos",
    "Formulas Magistrales"
];

// Helper to clean messy Algolia names (Heuristic)
function cleanProductName(rawName: string): string {
    if (!rawName) return 'Unknown';

    // 1. Remove obvious junk chars at start
    let name = rawName.replace(/^[\/\-\s]+/, '');

    // 2. Extract core name if possible (cutoff before dosage/presentation)
    // Common patterns to split on: "Product 500mg...", "Product Caja...", "Product Tabletas..."
    // Case insensitive split
    const parts = name.split(/\s(500mg|650mg|\d+mg|\d+g|\d+ml|Caja|Tabletas|Comprimidos|Sobres|Jarabes|Ampolla|Grageas|Capsulas)/i);

    if (parts.length > 1 && parts[0].length > 2) {
        name = parts[0];
    }

    // 3. Trim extra whitespace
    return name.trim();
}

export async function GET(request: Request) {
    const fs = require('fs');
    const log = (msg: string) => {
        try {
            fs.appendFileSync('resync-log.txt', `${new Date().toISOString()} - ${msg}\n`);
        } catch (e) { }
    };

    log('Starting Product Resync v4 (Clean Names Re-applied)');
    let totalUpserted = 0;
    let totalErrors = 0;

    try {
        for (const category of CATEGORIES) {
            log(`Scanning Category: ${category}`);
            let page = 0;
            let hitsCount = 0;
            const HITS_PER_PAGE = 100; // conservative

            while (true) {
                try {
                    const searchResult = await index.search('', {
                        facetFilters: [[`categorie:${category}`]],
                        hitsPerPage: HITS_PER_PAGE,
                        page: page
                    });

                    const hits = (searchResult as any).hits;
                    if (!hits || hits.length === 0) break;

                    hitsCount += hits.length;

                    // Transform for Supabase (Corrected Column Names & Cleaning)
                    const products = hits.map((h: any) => {
                        const rawName = h.mediaDescription || h.description || h.name || 'Unknown';
                        const cleaned = cleanProductName(rawName);

                        return {
                            id: h.objectID,
                            name: cleaned, // Use cleaned name for display
                            clean_name: cleaned, // Populate specialized column too
                            avg_price: h.offerPrice || h.fullPrice || h.price || 0,
                            image_url: h.mediaImageUrl || (h.listUrlImages && h.listUrlImages[0]) || h.image || '',
                            category: category,
                            is_pharma: true,
                            updated_at: new Date().toISOString()
                        };
                    });

                    // Upsert
                    const { error } = await supabase.from('products').upsert(products, {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });

                    if (error) {
                        log(`Error upserting batch ${page} for ${category}: ${error.message}`);
                        totalErrors += hits.length;
                    } else {
                        totalUpserted += hits.length;
                    }

                    if (page >= (searchResult as any).nbPages - 1) break;
                    page++;

                } catch (e: any) {
                    log(`Error fetching page ${page} of ${category}: ${e.message}`);
                    break;
                }
            }
            log(`Finished ${category}: ${hitsCount} products fetched.`);
        }

        log(`Resync Complete. Upserted: ${totalUpserted}`);
        return NextResponse.json({ success: true, upserted: totalUpserted, errors: totalErrors });

    } catch (e: any) {
        log(`Fatal Error: ${e.message}`);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
