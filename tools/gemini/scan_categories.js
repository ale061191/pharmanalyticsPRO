const algoliasearch = require('algoliasearch');

// CONFIG
const APP_ID = 'VCOJEYD2PO';
const API_KEY = '869a91e98550dd668b8b1dc04bca9011';
const INDEX_NAME = 'products-venezuela';

const client = algoliasearch(APP_ID, API_KEY);
const index = client.initIndex(INDEX_NAME);

async function main() {
    try {
        console.log('Fetching categories facets...');
        const result = await index.search('', {
            facets: ['categorie'],
            hitsPerPage: 0
        });

        const facets = result.facets['categorie'];
        console.log('All Categories in Index:');
        console.log(JSON.stringify(facets, null, 2));

        // Calculate total stats
        let total = 0;
        let pharmaTotal = 0;
        const PHARMA_KEYWORDS = ['salud', 'medicamentos', 'farmacia', 'dolor', 'gripe', 'vitaminas', 'botiquín', 'nutrición', 'vista', 'dermatológicos'];

        for (const [cat, count] of Object.entries(facets)) {
            total += count;
            const isPharma = PHARMA_KEYWORDS.some(k => cat.toLowerCase().includes(k));
            if (isPharma) pharmaTotal += count;
            console.log(`${cat}: ${count} ${isPharma ? '(Pharma?)' : ''}`);
        }

        console.log('----------------');
        console.log(`Total Products in Index: ${total}`);
        console.log(`Estimated Pharma Products: ${pharmaTotal}`);

    } catch (e) {
        console.error(e);
    }
}

main();
