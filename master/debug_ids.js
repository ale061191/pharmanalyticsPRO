
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    const { data: p } = await supabase.from('products').select('id').limit(5);
    const { data: i } = await supabase.from('store_inventory').select('product_id').limit(5);

    console.log('Products IDs:', p);
    console.log('Inventory IDs:', i);
}

debug();
