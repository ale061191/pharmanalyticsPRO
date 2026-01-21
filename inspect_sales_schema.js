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

async function inspect() {
    console.log('--- Inspecting sales_snapshots ---');

    // Check one record to see columns
    const { data: sample, error } = await supabase
        .from('sales_snapshots')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching sample:', error);
    } else {
        if (sample.length > 0) {
            console.log('Columns found based on sample record:');
            console.log(Object.keys(sample[0]));
            console.log('Sample Data:', sample[0]);
        } else {
            console.log('Table sales_snapshots is empty.');
        }
    }

    // Check count
    const { count } = await supabase.from('sales_snapshots').select('*', { count: 'exact', head: true });
    console.log('Total records:', count);

    // Also check if products table has any sales field
    console.log('\n--- Inspecting products table for sales fields ---');
    const { data: prodSample } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (prodSample && prodSample.length > 0) {
        const salesFields = Object.keys(prodSample[0]).filter(k => k.includes('sale') || k.includes('sold'));
        console.log('Potential sales fields in products:', salesFields);
    }
}

inspect();
