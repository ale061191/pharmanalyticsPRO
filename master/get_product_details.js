
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const algoliasearch = require('algoliasearch');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const algoliaClient = algoliasearch('VCOJEYD2PO', '869a91e98550dd668b8b1dc04bca9011');
const index = algoliaClient.initIndex('products-venezuela');

async function main() {
    const query = 'Acetaminofen + Clorfeniramina';

    console.log(`Searching for: "${query}" in Supabase...`);

    // Search in Supabase
    const { data: dbProducts, error } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(5);

    if (error) {
        console.error('Supabase Error:', error);
    } else {
        console.log(`Found ${dbProducts.length} products in DB.`);
        dbProducts.forEach(p => {
            console.log(`\n[DB] ID: ${p.id} | Name: ${p.name}`);
            console.log(`     Price: ${p.price}`);
            console.log(`     Metadata keys: ${Object.keys(p.metadata || {})}`);
        });
    }

    console.log(`\nSearching for: "${query}" in Algolia...`);
    // Search in Algolia to get fresh stock data
    const { hits } = await index.search(query, { hitsPerPage: 5 });

    hits.forEach(h => {
        console.log(`\n[Algolia] ID: ${h.objectID} | Name: ${h.description}`);
        console.log(`          Price: ${h.price} VES`);
        console.log(`          Stock in stores: ${h.stores_with_stock ? h.stores_with_stock.length : 0} stores`);
        if (h.stores_with_stock) {
            console.log(`          Store IDs (First 10): ${h.stores_with_stock.slice(0, 10).join(', ')}...`);
        }
    });
}

main();
