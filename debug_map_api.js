const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Simulate the logic in /api/map-data/route.ts manually because we can't run the route.ts directly in node easily without mocking Request objects.
// We will reproduce the exact query logic.

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debugMapApi() {
    console.log('🐞 Debugging Map API Logic...');

    // 1. Get a product with stock
    const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .ilike('name', '%ibuprofeno%')
        .limit(1);

    if (!products || products.length === 0) {
        console.log('No products found');
        return;
    }

    const product = products[0];
    console.log(`Testing with Product: ${product.name} (${product.id})`);

    // 2. Count branches
    const { count: branchCount } = await supabase
        .from('sucursales')
        .select('*', { count: 'exact', head: true });

    console.log(`Total Branches in DB: ${branchCount}`);

    // 3. Check inventory for this product
    const { data: inventory } = await supabase
        .from('store_inventory')
        .select('quantity, store_id')
        .eq('product_id', product.id)
        .gt('quantity', 0)
        .limit(5);

    console.log(`Found ${inventory?.length} stores with stock for this product.`);
    if (inventory?.length > 0) {
        console.log('Sample Store ID with stock:', inventory[0].store_id);
    }
}

debugMapApi();
