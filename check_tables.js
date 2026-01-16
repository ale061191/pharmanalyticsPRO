require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log("Checking required tables...\n");

    // Check stock_history
    const { count: shCount, error: shError } = await supabase
        .from('stock_history')
        .select('*', { count: 'exact', head: true });

    if (shError) {
        console.log(`❌ stock_history: ${shError.message}`);
    } else {
        console.log(`✅ stock_history exists. Rows: ${shCount}`);
    }

    // Check sucursales
    const { count: sucCount, error: sucError } = await supabase
        .from('sucursales')
        .select('*', { count: 'exact', head: true });

    if (sucError) {
        console.log(`❌ sucursales: ${sucError.message}`);
    } else {
        console.log(`✅ sucursales exists. Rows: ${sucCount}`);
    }

    // Check products count
    const { count: prodCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('url', 'is', null);

    console.log(`\n📦 Products with URLs: ${prodCount}`);
}

checkTables();
