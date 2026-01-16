require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScrapedData() {
    console.log("=== Verificando datos scrapeados ===\n");

    // Check stock_history count
    const { count: historyCount } = await supabase
        .from('stock_history')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Registros en stock_history: ${historyCount}`);

    // Get distinct cities
    const { data: cities } = await supabase
        .from('stock_history')
        .select('city')
        .limit(100);

    if (cities) {
        const uniqueCities = [...new Set(cities.map(c => c.city))];
        console.log(`\n🏙️ Ciudades capturadas (${uniqueCities.length}):`);
        uniqueCities.forEach(c => console.log(`   - ${c}`));
    }

    // Get sample of recent entries
    const { data: samples } = await supabase
        .from('stock_history')
        .select('product_name, city, stock_count, scraped_at')
        .order('scraped_at', { ascending: false })
        .limit(10);

    if (samples && samples.length > 0) {
        console.log("\n📋 Últimos 10 registros:");
        samples.forEach(s => {
            console.log(`   ${s.product_name.substring(0, 30)}... | ${s.city} | ${s.stock_count} unid`);
        });
    }

    // Check products with updated stock
    const { count: updatedCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('stock_count', 0);

    console.log(`\n✅ Productos con stock > 0: ${updatedCount}`);
}

checkScrapedData();
