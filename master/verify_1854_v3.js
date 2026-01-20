
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Fetching Medicamentos candidates (Paginated)...');

    // 1. Fetch all Medicamentos (Paginated)
    let candidates = [];
    let page = 0;
    let hasMore = true;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('products')
            .select('id, name')
            .eq('category', 'Medicamentos')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) { console.error(error); break; }

        if (data && data.length > 0) {
            candidates = candidates.concat(data);
            if (data.length < PAGE_SIZE) hasMore = false;
            else page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`Medicamentos Candidates: ${candidates.length}`);

    // 2. Check existence in store_inventory
    const chunkSize = 200;
    const activeIds = new Set();

    for (let i = 0; i < candidates.length; i += chunkSize) {
        const batch = candidates.slice(i, i + chunkSize);
        const ids = batch.map(c => c.id);

        const { data: inventory } = await supabase
            .from('store_inventory')
            .select('product_id')
            .in('product_id', ids);

        if (inventory) {
            inventory.forEach(item => activeIds.add(item.product_id));
        }

        process.stdout.write('.');
    }

    console.log(`\n\nFinal Verified Count: ${activeIds.size}`);
}

verify();
