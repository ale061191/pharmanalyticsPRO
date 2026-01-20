
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
    console.log('Checking Vademecum Stats...');

    const { count: totalProcessed, error: err1 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('atc_code', 'is', null);

    const { count: successCount, error: err2 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('atc_code', 'is', null)
        .neq('atc_code', 'N/A');

    const { count: naCount, error: err3 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('atc_code', 'N/A');

    const { count: activeCount, error: err4 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('active_ingredient', 'is', null);

    if (err1 || err2 || err3) {
        console.error('Error fetching stats:', err1 || err2 || err3);
        return;
    }

    console.log(`\n--- STATS ---`);
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Successful (ATC Found): ${successCount}`);
    console.log(`Successful (Active Found): ${activeCount}`);
    console.log(`No Data (N/A): ${naCount}`);
    console.log(`Success Rate: ${((successCount / totalProcessed) * 100).toFixed(1)}%`);
}

checkStats();
