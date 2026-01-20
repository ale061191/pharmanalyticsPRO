
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyActive() {
    console.log('Verifying count of Active Medicines (Category=Medicamentos + Stock>0)...');

    // Count products where category is 'Medicamentos' AND they have at least one inventory entry > 0
    // Using !inner implies they MUST exist in the joined table.
    // Filtering on the joined table quantity > 0.

    // Note: This returns products * inventory rows. So if a product is in 100 stores, we get 100 rows.
    // We want unique products. The client doesn't do "count distinct" easily.
    // However, if we fetch IDs and dedup in JS, reliable.

    // Strategy: Fetch all rows (paginated because of multiply by stores)? excessive.
    // Better: Fetch products, and use the filter.
    // To get distinct count from Supabase directly is hard.

    // Let's try to get a rough count or fetching JUST IDs involved.
    // Or... reuse the logic from verify_1854 but applying the filter carefully.

    // Let's try filtering on the relation.
    // select('id', { count: 'exact', head: true }) returns row count (joined).

    // Let's fetch IDs locally and count unique. 10k rows? 
    // If 1800 products x 50 stores = 90,000 rows. Too big.

    // Alternative: Filter purely.
    // Is there a "stores_with_stock" view? No.

    // Let's try:
    // Fetch products. 
    // IN BATCHES of 100, check if they have stock > 0 in store_inventory.
    // Count matches.

    // Batch approach.
    let activeMedicinesCount = 0;

    // 1. Fetch only Medicamentos products first (3209 total).
    let { data: candidates, error } = await supabase
        .from('products')
        .select('id')
        .eq('category', 'Medicamentos');

    // Pagination for candidates needed? 3209 might fit in default if I use loop? 
    // Supabase returns max 1000. So I need verify_1854.js pagination logic for candidates.

    let allCandidates = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
        const { data } = await supabase.from('products').select('id').eq('category', 'Medicamentos').range(page * 1000, (page + 1) * 1000 - 1);
        if (data && data.length > 0) {
            allCandidates = allCandidates.concat(data);
            if (data.length < 1000) hasMore = false;
            else page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`Candidates (Category=Medicamentos): ${allCandidates.length}`);

    // 2. For these candidates, check if ANY row in store_inventory has quantity > 0.
    // We can query store_inventory where product_id IN (batch) and quantity > 0.
    // Get distinct product_ids from that result.

    const BATCH_SIZE = 100;
    const activeSet = new Set();

    for (let i = 0; i < allCandidates.length; i += BATCH_SIZE) {
        const batchIds = allCandidates.slice(i, i + BATCH_SIZE).map(c => c.id);

        // Query inventory
        const { data: inv } = await supabase
            .from('store_inventory')
            .select('product_id')
            .in('product_id', batchIds)
            .gt('quantity', 0);

        if (inv) {
            inv.forEach(x => activeSet.add(x.product_id));
        }
    }

    console.log(`Active Medicines Count: ${activeSet.size}`);
}

verifyActive();
