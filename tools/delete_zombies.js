const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteZombies() {
    console.log('🏹 Starting Zombie Hunt (Deletion Mode)...');

    // 1. Get Active IDs (from Snapshot Jan 28)
    // We need to be absolutely sure this snapshot is complete.
    console.log('Fetching active snapshot records (Safe List)...');

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
            process.exit(1);
        }

        if (!snapshotData || snapshotData.length === 0) break;
        allSnapshotIds = allSnapshotIds.concat(snapshotData);
        if (snapshotData.length < SNAP_BATCH) break;
        snapPage++;
    }

    const activeIds = new Set(allSnapshotIds.map(s => String(s.product_id)));
    console.log(`✅ Active Products (Jan 28): ${activeIds.size}`);

    if (activeIds.size === 0) {
        console.error("❌ CRTICAL: No active products found. Aborting to prevent total wipeout.");
        process.exit(1);
    }

    // 2. Get ALL Products
    console.log('Fetching all products in DB...');
    let allProducts = [];
    let from = 0;
    const BATCH = 1000;

    // Max 15k products just in case
    for (let i = 0; i < 15; i++) {
        const to = from + BATCH - 1;
        const { data: products, error } = await supabase
            .from('products')
            .select('id, category')
            .range(from, to);

        if (error) {
            console.error('Error fetching products:', error);
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

    console.log(`\n🧟 TARGET AQUIRED: ${zombies.length} Zombies identified.`);

    // Double Check: Verify they are indeed "Sin Categoría" mostly
    const noCat = zombies.filter(z => !z.category); // or null
    console.log(`   - Verified "No Category" subset: ${noCat.length}`);

    if (zombies.length === 0) {
        console.log("✨ No zombies found. Database is clean.");
        return;
    }

    // 4. BATCH DELETE
    // Supabase delete with 'in' filter
    const zombieIds = zombies.map(z => z.id);
    const DELETE_BATCH_SIZE = 200;
    let deletedCount = 0;

    console.log(`\n🔥 Initiating Deletion Sequence in batches of ${DELETE_BATCH_SIZE}...`);

    for (let i = 0; i < zombieIds.length; i += DELETE_BATCH_SIZE) {
        const batchIds = zombieIds.slice(i, i + DELETE_BATCH_SIZE);

        const { error: delError, count } = await supabase
            .from('products')
            .delete({ count: 'exact' })
            .in('id', batchIds);

        if (delError) {
            console.error(`❌ Delete failed for batch ${i}: ${delError.message}`);
        } else {
            //   console.log(`   💥 Eliminated batch ${i} - ${i + batchIds.length}`);
            deletedCount += batchIds.length; // Count varies if count option not returned properly, but usually OK
        }

        process.stdout.write(`\r💥 Progress: ${deletedCount} / ${zombieIds.length} eliminated`);
    }

    console.log(`\n\n✅ MISSION COMPLETE. ${deletedCount} Zombies removed.`);
}

deleteZombies();
