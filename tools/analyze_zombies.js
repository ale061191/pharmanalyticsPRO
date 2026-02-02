const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeZombies() {
    console.log('🔍 Analyzing "Zombie" Products (In DB but not in Snapshot)...');

    // 1. Get Active IDs (from Snapshot Jan 28)
    const { data: snapshotData, error: snapError } = await supabase
        .from('sales_snapshot')
        .select('product_id')
        .eq('snapshot_date', '2026-01-28');

    if (snapError) {
        console.error('❌ Error fetching snapshot:', snapError.message);
        return;
    }

    const activeIds = new Set(snapshotData.map(s => String(s.product_id)));
    console.log(`✅ Active Products (Jan 28): ${activeIds.size}`);

    // 2. Get All Products with Categories
    // Pagination to get all 8000+
    let allProducts = [];
    let page = 0;
    const PAGE_SIZE = 1000;

    while (true) {
        console.log(`   Fetching page ${page}...`);
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, categoria, nombre')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (prodError) {
            console.error('❌ Error fetching products:', prodError.message);
            break;
        }

        if (products && products.length > 0) {
            allProducts.push(...products);
            console.log(`   Fetched ${products.length} products (Total: ${allProducts.length})`);
        }

        if (!products || products.length < PAGE_SIZE) break;
        page++;
    }

    console.log(`✅ Total Products in DB: ${allProducts.length}`);

    // 3. Identify Zombies
    const zombies = allProducts.filter(p => !activeIds.has(String(p.id)));

    console.log(`🧟 Zombie Count: ${zombies.length}`);

    if (zombies.length === 0) {
        console.log('No zombies found! (Mismatch might be due to date timing?)');
        return;
    }

    // 4. Analyze Categories
    const categoryCounts = {};
    zombies.forEach(z => {
        const cat = z.categoria || 'Sin Categoría';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    console.log('\n📊 Zombie Categories Breakdown:');
    const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

    sortedCats.slice(0, 15).forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count}`);
    });

    // 5. Sample Check
    console.log('\n🧪 Sample Zombies (Pharma Check):');
    const pharmaKeywords = ['medicamentos', 'salud', 'dolor', 'gripe', 'vitaminas'];
    const pharmaZombies = zombies.filter(z => {
        const cat = (z.categoria || '').toLowerCase();
        return pharmaKeywords.some(k => cat.includes(k));
    });

    console.log(`   Potential Pharma Zombies: ${pharmaZombies.length} / ${zombies.length}`);

    if (pharmaZombies.length > 0) {
        console.log('   Examples:');
        pharmaZombies.slice(0, 5).forEach(z => console.log(`     - ${z.nombre} (${z.categoria})`));
    }
}

analyzeZombies();
