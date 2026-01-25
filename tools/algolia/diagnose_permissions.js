const algoliasearch = require('algoliasearch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// CONFIG
const ALGOLIA_APP_ID = "VCOJEYD2PO";
const ALGOLIA_API_KEY = "869a91e98550dd668b8b1dc04bca9011";
const ALGOLIA_INDEX = "products";

async function diagnose() {
    console.log('🩺 Diagnosing Algolia Permissions...');
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    const index = client.initIndex(ALGOLIA_INDEX);

    // Test 1: Search (Should work based on previous test)
    try {
        console.log('Test 1: Search...');
        const res = await index.search('', { hitsPerPage: 1 });
        console.log(`✅ Search OK. Found ${res.nbHits} hits.`);
    } catch (e) {
        console.log(`❌ Search Failed: ${e.message}`);
    }

    // Test 2: Browse (Failed last time)
    try {
        console.log('Test 2: Browse...');
        const iterator = index.browseObjects();
        await iterator.next(); // Try to get first batch
        console.log('✅ Browse OK.');
    } catch (e) {
        console.log(`❌ Browse Failed: ${e.message}`);
    }
}

diagnose();
