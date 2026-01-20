
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkOverlap() {
    console.log("🔍 Checking ID Overlap...");

    // 1. Get 10 IDs from Inventory
    const { data: invItems } = await supabase
        .from('store_inventory')
        .select('product_id')
        .gt('quantity', 0)
        .limit(10);

    if (!invItems || invItems.length === 0) {
        console.log("❌ No active inventory items found!");
        return;
    }

    const invIds = invItems.map(i => i.product_id);
    console.log("Inventory IDs Sample:", invIds);

    // 2. Check if these exist in Products
    const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', invIds);

    console.log(`✅ Found ${products ? products.length : 0} matching products in 'products' table.`);
    if (products && products.length > 0) {
        console.log("Sample Matches:", products);
    } else {
        console.log("❌ Inventory IDs do NOT match Product IDs! Format mismatch suspected.");
    }

    // 3. Test "Inventory First" Strategy for API
    console.log("\n🧪 Testing 'Inventory First' Query Strategy...");
    const { data: activeStock } = await supabase
        .from('store_inventory')
        .select('product_id')
        .gt('quantity', 0)
        .limit(50); // Fetch 50 active IDs

    if (activeStock) {
        const uniqueIds = [...new Set(activeStock.map(i => i.product_id))];
        console.log(`Fetched ${uniqueIds.length} unique active IDs.`);

        const { data: finalProducts } = await supabase
            .from('products')
            .select('id, name')
            .in('id', uniqueIds);

        console.log(`Final Result: ${finalProducts ? finalProducts.length : 0} products would be shown.`);
    }
}

checkOverlap();
