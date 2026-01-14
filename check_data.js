const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkData() {
    console.log('🔍 Inspecting Data...');

    // 1. Check Count
    const { count, error: countError } = await supabase.from('stock_detail').select('*', { count: 'exact', head: true });
    console.log(`Total Stock Records: ${count}`);

    // 2. Check Sample
    const { data: sample } = await supabase.from('stock_detail').select('product_name, lab_name, stock_count').limit(10);
    console.log('Sample Records:', sample);

    // 3. Check "Acetaminofen" specifically
    const { data: aceta } = await supabase.from('stock_detail')
        .select('product_name, lab_name')
        .ilike('product_name', '%acetaminofen%')
        .limit(5);
    console.log('Acetaminofen Records:', aceta);
}

checkData();
