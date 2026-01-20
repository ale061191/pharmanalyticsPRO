
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
    const { count, error } = await supabase
        .from('store_inventory')
        .select('*', { count: 'exact', head: true })
        .gt('quantity', 0);

    if (error) console.error(error);
    else console.log(`Inventory rows with quantity > 0: ${count}`);
}

checkStock();
