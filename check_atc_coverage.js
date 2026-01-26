
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkATC() {
    console.log('--- ATC Code Coverage Analysis ---');

    // 1. Total Products
    const { count: total } = await supabase.from('products').select('*', { count: 'exact', head: true });

    // 2. Products with ATC
    const { count: withAtc } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('atc_code', 'is', null);

    // 3. Sample check of recent imports (using 'Dol' as a proxy for recent phase 2)
    const { data: recentSample } = await supabase
        .from('products')
        .select('name, atc_code')
        .ilike('name', '%Dol%') // Broad search to catch Dol Kids, Dol Plus
        .limit(10);

    console.log(`\nStatistics:`);
    console.log(`- Total Products: ${total}`);
    console.log(`- With ATC Code: ${withAtc} (${((withAtc / total) * 100).toFixed(1)}%)`);

    console.log(`\nSample Check (Recent/Dol):`);
    recentSample.forEach(p => {
        console.log(`- ${p.name.substring(0, 30)}... [ATC: ${p.atc_code || '❌ MISSING'}]`);
    });
}

checkATC();
