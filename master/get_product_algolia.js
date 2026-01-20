
const algoliasearch = require('algoliasearch');

// Hardcoded keys from previous context
const algoliaClient = algoliasearch('VCOJEYD2PO', '869a91e98550dd668b8b1dc04bca9011');
const index = algoliaClient.initIndex('products-venezuela');

async function main() {
    const query = 'Acetaminofen + Clorfeniramina 500 Mg/4Mg Clorace Caja x 20 tabletas';

    console.log(`Searching for: "${query}" in Algolia...`);

    const { hits } = await index.search(query, { hitsPerPage: 1 });

    if (hits.length === 0) {
        console.log('No products found.');
        return;
    }

    const h = hits[0];
    console.log(`\n[Found] ID: ${h.objectID}`);
    /*
  console.log(`Name: ${h.description}`);
  console.log(`Brand: ${h.brand}`);
  console.log(`Price: ${h.price} VES`);
  console.log(`Image: ${h.image}`);
  */

    const fs = require('fs');
    const path = require('path');
    const infoPath = path.join(__dirname, 'product_full_info.json');
    fs.writeFileSync(infoPath, JSON.stringify(h, null, 2));
    console.log('Saved product info to ' + infoPath);

    if (h.stores_with_stock) {
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, 'product_stores.json');
        fs.writeFileSync(outputPath, JSON.stringify(h.stores_with_stock, null, 2));
        console.log(`Saved ${h.stores_with_stock.length} store IDs to ${outputPath}`);
    }
}

main();
