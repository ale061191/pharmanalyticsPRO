
require('dotenv').config({ path: '.env.local' });
const algoliasearch = require('algoliasearch');
const fs = require('fs');
const path = require('path');

const client = algoliasearch(
    process.env.ALGOLIA_APP_ID_VEN || 'VCOJEYD2PO',
    process.env.ALGOLIA_API_KEY_VEN || '869a91e98550dd668b8b1dc04bca9011'
);
const index = client.initIndex('products-venezuela');

async function main() {
    console.log("Starting full harvest of 'Salud y Medicamentos' using Prefix Search...");

    // Prefixes to scan: a-z, 0-9.
    // Also including empty string scan for top items? No, empty string returns everything but limited to 1000.
    // The prefixes should cover most things.
    const prefixes = [...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')];
    let allHitsMap = new Map(); // Use Map to deduplicate by objectID

    for (const char of prefixes) {
        console.log(`Scanning prefix: '${char}'...`);
        let page = 0;
        let nbPages = 1;

        while (page < nbPages) {
            try {
                const results = await index.search(char, {
                    facetFilters: ['departments:Salud y Medicamentos'],
                    hitsPerPage: 1000,
                    page: page,
                    attributesToRetrieve: [

                        'objectID',
                        'mediaDescription',
                        'description',
                        'price',
                        'fullPrice',
                        'offerPrice',
                        'offerText',
                        'image',
                        'brand',
                        'departments',
                        'categorie',
                        'subCategory',
                        'stores_with_stock'
                    ]
                });

                nbPages = results.nbPages;

                results.hits.forEach(h => {
                    allHitsMap.set(h.objectID, h);
                });

                console.log(`  > Page ${page + 1}/${nbPages} (Hits: ${results.nbHits}): Found ${results.hits.length} items.`);

                if (results.nbHits > 1000 && page === 0) {
                    console.log("    WARNING: Prefix has > 1000 hits. Pagination might be restricted.");
                }

                page++;

            } catch (err) {
                console.error(`  > Error on prefix '${char}' page ${page}:`, err.message);
                break;
            }
        }
    }

    const allHits = Array.from(allHitsMap.values());
    console.log(`Harvest complete. Total unique products: ${allHits.length}`);

    const processed = allHits.map(h => {
        let finalPrice = h.price;
        let originalPrice = h.fullPrice || h.price;
        let discountPct = 0;

        if (h.offerPrice && h.offerPrice < originalPrice) {
            finalPrice = h.offerPrice;
            discountPct = Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
        }

        return {
            id: h.objectID,
            name: h.mediaDescription || h.description || "Unknown Product",
            brand: h.brand || 'N/A',
            price_real: finalPrice,
            price_full: originalPrice,
            discount_percent: discountPct,
            image: h.image,
            category: h.categorie,
            subcategory: h.subCategory,
            department: h.departments ? h.departments[0] : 'N/A',
            stock_stores_count: h.stores_with_stock ? h.stores_with_stock.length : 0,
            stock_stores_ids: h.stores_with_stock || []
        };
    });

    const outputPath = path.join(__dirname, 'data', 'algolia_products.json');
    if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2));
    console.log(`Saved to ${outputPath}`);
}

main();
