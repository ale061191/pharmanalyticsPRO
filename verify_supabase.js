require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying Supabase access...');

    // Try to select the count of products
    const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error fetching count:', countError);
    } else {
        console.log(`Total products: ${count}`);
    }

    // Verify Stock Status distribution
    const { count: availableCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('stock_count', 0);

    const { count: outOfStockCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('stock_count', 0);

    console.log(`\n--- Stock Status Verification ---`);
    console.log(`Available Products (Stock > 0): ${availableCount}`);
    console.log(`Out of Stock Products (Stock = 0): ${outOfStockCount}`);

    // Show a sample of Out of Stock items
    // Fetch one product URL for testing deep scrape
    const { data: sampleUrl } = await supabase
        .from('products')
        .select('name, url')
        .limit(1);

    if (sampleUrl && sampleUrl.length > 0) {
        console.log(`\nSample URL for Deep Scrape: ${sampleUrl[0].url}`);
    }

    // Check 'sucursales' table
    const { count: sucursalesCount, error: sucursalesError } = await supabase
        .from('sucursales')
        .select('*', { count: 'exact', head: true });

    if (sucursalesError) {
        console.log(`\n⚠️ Table 'sucursales' check failed: ${sucursalesError.message} (Likely needs migration)`);
    } else {
        console.log(`\n✅ Table 'sucursales' exists. Count: ${sucursalesCount}`);
    }
}

verify();
