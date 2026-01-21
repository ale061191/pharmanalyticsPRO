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
    console.log('--- Inspecting stock_history ---');

    // Check one record to see columns
    const { data: sample, error } = await supabase
        .from('stock_history')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching sample:', error);
    } else {
        if (sample && sample.length > 0) {
            console.log('Columns found:', Object.keys(sample[0]));
            console.log('Sample Data:', sample[0]);
        } else {
            console.log('Table stock_history exists but is empty.');
        }
    }

    // Count records
    const { count } = await supabase.from('stock_history').select('*', { count: 'exact', head: true });
    console.log('Total history records:', count);
}

inspect();
