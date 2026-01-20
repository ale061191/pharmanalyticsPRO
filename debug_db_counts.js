
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    const { count: prodCount, error: prodError } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { count: inventoryCount, error: invError } = await supabase.from('store_inventory').select('*', { count: 'exact', head: true });
    const { count: activeInvCount, error: activeError } = await supabase.from('store_inventory').select('*', { count: 'exact', head: true }).gt('quantity', 0);

    console.log("📊 DB COUNTS:");
    console.log(`Products: ${prodCount} (Error: ${prodError?.message})`);
    console.log(`Total Inventory Rows: ${inventoryCount} (Error: ${invError?.message})`);
    console.log(`Active Inventory (>0): ${activeInvCount} (Error: ${activeError?.message})`);
}

checkCounts();
