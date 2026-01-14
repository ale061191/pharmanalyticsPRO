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

    const cityFilter = 'Caracas';
    const municipalityFilter = 'Libertador';
    const productSearch = 'ibuprofeno';
    const labFilter = 'genven';

    console.log(`Filters: City=${cityFilter}, Muni=${municipalityFilter}, Product=${productSearch}, Lab=${labFilter}`);

    // 1. Query Branches
    let branchQuery = supabase
        .from('sucursales')
        .select('name, municipality, lat, lng');

    if (cityFilter) branchQuery = branchQuery.eq('city', cityFilter);
    if (municipalityFilter) branchQuery = branchQuery.eq('municipality', municipalityFilter);

    const { data: branches, error: errBranch } = await branchQuery;

    if (errBranch) {
        console.error('Branch Query Error:', errBranch);
        return;
    }

    console.log(`\nfound ${branches.length} branches in ${municipalityFilter}.`);
    // console.log(branches.map(b => b.name));

    // 2. Query Stock
    let stockQuery = supabase
        .from('stock_detail')
        .select('store_name, stock_count, availability_status, product_name, lab_name')
        .ilike('product_name', `%${productSearch}%`)
        .ilike('lab_name', `%${labFilter}%`);

    const { data: stockData, error: errStock } = await stockQuery;

    if (errStock) {
        console.error('Stock Query Error:', errStock);
        return;
    }

    console.log(`Found ${stockData.length} stock entries matching filters.`);

    // 3. Match
    const enriched = branches.map(branch => {
        const stock = stockData.find(s => s.store_name === branch.name); // Simple find for debug
        return {
            name: branch.name,
            stock: stock ? stock.stock_count : 0,
            status: stock ? stock.availability_status : 'critical (no match)'
        };
    });

    // Show breakdown
    console.log('\n--- Enriched Results ---');
    enriched.forEach(e => {
        console.log(`[${e.name}] Stock: ${e.stock} (${e.status})`);
    });
}

debugMapApi();
