/**
 * verify_deep_scrape.js
 * 
 * Comprehensive verification of deep scrape results
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("╔════════════════════════════════════════╗");
    console.log("║  VERIFICACIÓN DETALLADA - DEEP SCRAPE  ║");
    console.log("╚════════════════════════════════════════╝\n");

    // 1. Total records in stock_history
    console.log("📊 1. REGISTROS EN STOCK_HISTORY");
    const { count: totalRecords } = await supabase
        .from('stock_history')
        .select('*', { count: 'exact', head: true });
    console.log(`   Total: ${totalRecords?.toLocaleString() || 'Error'}\n`);

    // 2. Distinct products scraped
    console.log("📦 2. PRODUCTOS ÚNICOS SCRAPEADOS");
    const { data: distinctProducts } = await supabase
        .from('stock_history')
        .select('product_name')
        .limit(10000);

    if (distinctProducts) {
        const uniqueProducts = [...new Set(distinctProducts.map(p => p.product_name))];
        console.log(`   Productos únicos: ${uniqueProducts.length}\n`);
    }

    // 3. Distribution by city
    console.log("🏙️  3. DISTRIBUCIÓN POR CIUDAD");
    const { data: cityData } = await supabase
        .from('stock_history')
        .select('city');

    if (cityData) {
        const cityCount = {};
        cityData.forEach(row => {
            cityCount[row.city] = (cityCount[row.city] || 0) + 1;
        });

        // Sort by count
        const sorted = Object.entries(cityCount)
            .sort((a, b) => b[1] - a[1]);

        sorted.forEach(([city, count]) => {
            const bar = '█'.repeat(Math.min(20, Math.floor(count / (sorted[0][1] / 20))));
            console.log(`   ${city.padEnd(25)} ${count.toString().padStart(6)} ${bar}`);
        });
    }

    // 4. Stock summary
    console.log("\n📈 4. RESUMEN DE STOCK");
    const { data: stockData } = await supabase
        .from('stock_history')
        .select('stock_count');

    if (stockData) {
        const totalStock = stockData.reduce((sum, r) => sum + (r.stock_count || 0), 0);
        const avgStock = totalStock / stockData.length;
        const withStock = stockData.filter(r => r.stock_count > 0).length;
        const outOfStock = stockData.filter(r => r.stock_count === 0).length;

        console.log(`   Stock total acumulado: ${totalStock.toLocaleString()}`);
        console.log(`   Promedio por registro: ${avgStock.toFixed(1)}`);
        console.log(`   Con stock (>0): ${withStock.toLocaleString()}`);
        console.log(`   Sin stock (=0): ${outOfStock.toLocaleString()}`);
    }

    // 5. Products table update check
    console.log("\n✅ 5. PRODUCTOS ACTUALIZADOS");
    const { count: updatedProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('stock_count', 0);

    const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    console.log(`   Productos con stock > 0: ${updatedProducts}/${totalProducts}`);

    // 6. Recent entries sample
    console.log("\n📋 6. ÚLTIMAS 5 ENTRADAS");
    const { data: recent } = await supabase
        .from('stock_history')
        .select('product_name, city, stock_count, scraped_at')
        .order('scraped_at', { ascending: false })
        .limit(5);

    if (recent) {
        recent.forEach(r => {
            console.log(`   ${r.product_name.substring(0, 30).padEnd(32)} | ${r.city.padEnd(15)} | ${r.stock_count} unid`);
        });
    }

    // 7. Time range
    console.log("\n🕐 7. RANGO DE TIEMPO");
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

    if (firstEntry && lastEntry) {
        console.log(`   Primera entrada: ${firstEntry[0]?.scraped_at}`);
        console.log(`   Última entrada:  ${lastEntry[0]?.scraped_at}`);
    }

    console.log("\n╔════════════════════════════════════════╗");
    console.log("║         FIN DE VERIFICACIÓN            ║");
    console.log("╚════════════════════════════════════════╝");
}

verify();
