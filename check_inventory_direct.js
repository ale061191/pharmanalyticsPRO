const { createClient } = require('@supabase/supabase-js');

// Hardcoded creds from previous context or environment file if available
// Assuming we need to read .env first or just ask user. But let's try reading .env.local
require('dotenv').config({ path: '.env.local' });

async function checkInventory() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing env vars. Please ensure .env.local exists.");
        // Try reading file content directly if dotenv fails
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const productId = '113354489';

    console.log(`Checking inventory for ID: ${productId}`);

    // 1. Check aggregate stock
    const { data: inventory, error } = await supabase
        .from('store_inventory')
        .select(`
            id,
            quantity,
            sucursal:sucursales (
                name,
                city
            )
        `)
        .eq('product_id', productId)
        .gt('quantity', 0);

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    console.log(`Found ${inventory.length} inventory records.`);

    if (inventory.length > 0) {
        console.log("Sample Data:", JSON.stringify(inventory.slice(0, 3), null, 2));

        // Check Coro
        const coro = inventory.filter(i => i.sucursal?.city?.toLowerCase() === 'coro');
        console.log(`Coro Records: ${coro.length}`);
        if (coro.length > 0) {
            const total = coro.reduce((acc, c) => acc + c.quantity, 0);
            console.log(`Coro Total Stock: ${total}`);
        }
    } else {
        console.log("No inventory found.");
    }
}

checkInventory();
