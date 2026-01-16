/**
 * verify_simple.js - Simplified verification with JSON output
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    const results = {};

    // 1. Total records
    const { count: totalRecords } = await supabase
        .from('stock_history')
        .select('*', { count: 'exact', head: true });
    results.total_registros = totalRecords;

    // 2. City distribution (get all and count locally)
    const { data: cityData } = await supabase
        .from('stock_history')
        .select('city')
        .limit(50000);

    if (cityData) {
        const cityCount = {};
        cityData.forEach(row => {
            cityCount[row.city] = (cityCount[row.city] || 0) + 1;
        });
        results.ciudades = cityCount;
        results.total_ciudades = Object.keys(cityCount).length;
    }

    // 3. Products with stock updated
    const { count: productsWithStock } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('stock_count', 0);

    const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    results.productos_con_stock = productsWithStock;
    results.productos_totales = totalProducts;

    // 4. Time range
    const { data: firstEntry } = await supabase
        .from('stock_history')
        .select('scraped_at')
        .order('scraped_at', { ascending: true })
        .limit(1);

    const { data: lastEntry } = await supabase
        .from('stock_history')
        .select('scraped_at')
        .order('scraped_at', { ascending: false })
        .limit(1);

    results.primera_entrada = firstEntry?.[0]?.scraped_at;
    results.ultima_entrada = lastEntry?.[0]?.scraped_at;

    // Write to file for easy reading
    fs.writeFileSync('verification_results.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
}

verify();
