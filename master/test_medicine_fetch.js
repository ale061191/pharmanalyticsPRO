
const algoliasearch = require('algoliasearch');
const fs = require('fs');
const path = require('path');

const client = algoliasearch('VCOJEYD2PO', '869a91e98550dd668b8b1dc04bca9011');
const index = client.initIndex('products-venezuela');

async function main() {
    console.log("Fetching 'Salud y Medicamentos'...");

    // Facet filter for the department
    const results = await index.search('', {
        facetFilters: ['departments:Salud y Medicamentos'],
        hitsPerPage: 5,
        attributesToRetrieve: [
            'objectID',
            'description',
            'price',
            'fullPrice',
            'offerPrice',
            'offerText', // Sometimes discount % is here directly?
            'image',
            'brand',
            'departments',
            'categorie',
            'subCategory',
            'stores_with_stock'
        ]
    });

    console.log(`Found ${results.nbHits} products.`);

    const processed = results.hits.map(h => {
        // Logic to calculate REAL discount
        let finalPrice = h.price;
        let originalPrice = h.fullPrice || h.price;
        let discountPct = 0;

        // Verify if offer exists and is valid
        if (h.offerPrice && h.offerPrice < originalPrice) {
            finalPrice = h.offerPrice;
            discountPct = Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
        }

        return {
            id: h.objectID,
            name: h.description,
            price_real: finalPrice,
            price_full: originalPrice,
            discount_calculated: discountPct + '%',
            discount_text: h.offerText, // Compare with this
            category: h.categorie,
            subcategory: h.subCategory,
            stock_stores: h.stores_with_stock ? h.stores_with_stock.length : 0
        };
    });

    console.log(JSON.stringify(processed, null, 2));
}

main();
