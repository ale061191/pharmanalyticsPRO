
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkInventory() {
    console.log("🔍 Checking Store Inventory...");

    // 1. Total Count
    const { count: total, error: err1 } = await supabase
        .from('store_inventory')
        .select('*', { count: 'exact', head: true });

    if (err1) console.error("Error counting total:", err1);
    else console.log(`📊 Total rows in store_inventory: ${total}`);

    // 2. Quantity > 0 Count
    const { count: active, error: err2 } = await supabase
        .from('store_inventory')
        .select('*', { count: 'exact', head: true })
        .gt('quantity', 0);

    if (err2) console.error("Error counting active:", err2);
    else console.log(`✅ Active rows (quantity > 0): ${active}`);

    // 3. Sample
    if (active > 0) {
        const { data } = await supabase
            .from('store_inventory')
            .select('product_id, quantity')
            .gt('quantity', 0)
            .limit(5);
        console.log("Sample active items:", data);
    } else {
        console.log("⚠️ No active items found! Snapshot might be all zeros or failed.");
    }
}

checkInventory();
