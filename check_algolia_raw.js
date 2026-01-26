
const algoliasearch = require('algoliasearch');
require('dotenv').config({ path: '.env.local' });

// CONFIG
const ALGOLIA_APP_ID = "VCOJEYD2PO";
const ALGOLIA_API_KEY = "869a91e98550dd668b8b1dc04bca9011";
const ALGOLIA_INDEX = "products";

async function checkAlgolia() {
    console.log(`Checking Algolia Index: ${ALGOLIA_INDEX} for "Dol Kids"...`);
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    const index = client.initIndex(ALGOLIA_INDEX);

    // 3. Alternative Searches
    const queries = ["Dollder", "Acetaminofen Kids", "Acetaminofen Niños", "Acetaminofen Plus"];
    for (const q of queries) {
        console.log(`\nChecking "${q}"...`);
        const res = await index.search(q, { hitsPerPage: 10 });
        console.log(`Hits: ${res.nbHits}`);
        res.hits.forEach(h => {
            // Description is usually the name in Farmatodo
            console.log(`- [${h.objectID}] ${h.description} (Brand: ${h.brand})`);
        });
    }
}

checkAlgolia();
