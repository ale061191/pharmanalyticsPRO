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

async function checkBranches() {
    console.log('🔍 Checking Branches Data...\n');

    // 1. Check Montalbán specifically
    const { data: montalban, error: err1 } = await supabase
        .from('sucursales')
        .select('*')
        .ilike('name', '%Montalbán%');

    if (err1) console.error('Error fetching Montalban:', err1.message);
    else console.log('Farmatodo Montalbán Record:', montalban);

    // 2. Count Caracas Branches
    const { count, error: countError } = await supabase
        .from('sucursales')
        .select('*', { count: 'exact', head: true })
        .eq('city', 'Caracas');

    console.log(`\n Total Branches in Caracas: ${count}`);

    // 3. List all Caracas Branches to see which are missing
    const { data: allCaracas } = await supabase
        .from('sucursales')
        .select('name, municipality, lat, lng')
        .eq('city', 'Caracas');

    console.log('\n List of Caracas Branches:', allCaracas?.map(b => b.name));

}

checkBranches();
