const { createClient } = require('@supabase/supabase-js');
const algoliasearch = require('algoliasearch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const ALGOLIA_CONFIG = {
    appId: 'VCOJEYD2PO',
    apiKey: '869a91e98550dd668b8b1dc04bca9011',
    indexName: 'products-venezuela'
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const client = algoliasearch(ALGOLIA_CONFIG.appId, ALGOLIA_CONFIG.apiKey);
const index = client.initIndex(ALGOLIA_CONFIG.indexName);

async function check() {
    // Get 5 random IDs
    const { data: products } = await supabase.from('products').select('id').limit(5);
    const ids = products.map(p => p.id);
    console.log('Checking IDs:', ids);

    const res = await index.getObjects(ids);
    const found = res.results.filter(x => x !== null).length;

    console.log(`Found ${found} of ${ids.length} in Algolia.`);
    res.results.forEach((r, i) => {
        console.log(`ID ${ids[i]}: ${r ? '✅ Found' : '❌ NOT FOUND'}`);
    });
}

check();
