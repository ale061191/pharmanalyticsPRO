
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('Fetching 10 Active Inventory Items...');
    const { data: inventory } = await supabase.from('store_inventory').select('product_id').limit(10);

    if (!inventory) return;

    const ids = [...new Set(inventory.map(i => i.product_id))];
    console.log(`Checking IDs:`, ids);

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, category')
        .in('id', ids);

    if (error) console.error(error);

    console.log('--- Matching Products ---');
    console.log(JSON.stringify(products, null, 2));
}

debug();
