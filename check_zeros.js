const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkZeroStock() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const productId = '113354489';

    // 1. Check for explicit 0s
    const { count: explicitZeros } = await supabase
        .from('store_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('quantity', 0);

    // 2. Check total inventory records
    const { count: totalInventory } = await supabase
        .from('store_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

    // 3. Check total stores
    const { count: totalStores } = await supabase
        .from('sucursales')
        .select('*', { count: 'exact', head: true });

    console.log(`Explicit Zeros in DB: ${explicitZeros}`);
    console.log(`Total Inventory Records: ${totalInventory}`);
    console.log(`Total Stores in DB: ${totalStores}`);
    console.log(`Missing Records (Implicit 0s): ${totalStores - totalInventory}`);
}

checkZeroStock();
