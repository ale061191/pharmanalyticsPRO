const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeZombies() {
    console.log('🔍 Analyzing "Zombie" Products (Simple V2)...');

    // 1. Get Active IDs (from Snapshot Jan 28)
    console.log('Fetching active snapshot records...');

    let allSnapshotIds = [];
    let snapPage = 0;
    const SNAP_BATCH = 1000;

    while (true) {
        const { data: snapshotData, error: snapError } = await supabase
            .from('sales_snapshot')
            .select('product_id')
            .eq('snapshot_date', '2026-01-28')
            .range(snapPage * SNAP_BATCH, (snapPage + 1) * SNAP_BATCH - 1);

        if (snapError) {
            console.error('❌ Error fetching snapshot:', snapError.message);
            break;
        }

        if (!snapshotData || snapshotData.length === 0) break;
        allSnapshotIds = allSnapshotIds.concat(snapshotData);
        if (snapshotData.length < SNAP_BATCH) break;
        snapPage++;
    }

    const activeIds = new Set(allSnapshotIds.map(s => String(s.product_id)));
    console.log(`✅ Active Products (Jan 28): ${activeIds.size}`);

    // 2. Get ALL Products
    console.log('Fetching all products in DB...');
    let allProducts = [];
    let from = 0;
    const BATCH = 1000;

    // Safety limit 10 batches (10k products)
    for (let i = 0; i < 15; i++) {
        const to = from + BATCH - 1;
        // console.log(`   Fetching ${from} - ${to}`);

        const { data: products, error } = await supabase
            .from('products')
            .select('id, category, name')
            .range(from, to);

        if (error) {
            console.error('Error:', error);
            break;
        }

        if (!products || products.length === 0) break;

        allProducts = allProducts.concat(products);

        if (products.length < BATCH) break;
        from += BATCH;
    }

    console.log(`✅ Total Products in DB: ${allProducts.length}`);

    // 3. Identify Zombies
    const zombies = allProducts.filter(p => !activeIds.has(String(p.id)));
    console.log(`🧟 Zombie Count: ${zombies.length}`);

    if (zombies.length === 0) return;

    // 4. Analyze Categories
    const categoryCounts = {};
    zombies.forEach(z => {
        const cat = z.category || 'Sin Categoría';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    console.log('\n📊 Zombie Categories Breakdown (Top 20):');
    const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

    sortedCats.slice(0, 20).forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count}`);
    });
}

analyzeZombies();
