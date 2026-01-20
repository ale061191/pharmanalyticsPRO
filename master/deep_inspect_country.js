const fs = require('fs');

const ALGOLIA_APP_ID = 'VCOJEYD2PO';
const ALGOLIA_API_KEY = '869a91e98550dd668b8b1dc04bca9011';
const ALGOLIA_INDEX = 'products-venezuela';

async function analyze() {
    console.log(`🔍 Inspecting Index: ${ALGOLIA_INDEX}`);

    // Minimal query to get 1 hit
    const url = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Algolia-Application-Id': ALGOLIA_APP_ID,
                'X-Algolia-API-Key': ALGOLIA_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: 'Acetaminofen', hitsPerPage: 1 })
        });

        const data = await res.json();
        if (data.hits && data.hits.length > 0) {
            const hit = data.hits[0];
            console.log('✅ HIT FOUND!');
            console.log('Keys:', Object.keys(hit));
            // Log full object to file for checking stock structure
            fs.writeFileSync('master/inspect_output.json', JSON.stringify(hit, null, 2));
            console.log('Saved to inspect_output.json');
        } else {
            console.log('❌ No hits found.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

analyze();
