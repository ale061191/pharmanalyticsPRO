
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Fetching ALL products (paginated) to count categories...');

    let allProducts = [];
    const PAGE_SIZE = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        const { data: products, error } = await supabase
            .from('products')
            .select('id, category')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching page', page, error);
            break;
        }

        if (products && products.length > 0) {
            allProducts = allProducts.concat(products);
            if (products.length < PAGE_SIZE) hasMore = false;
            else page++;
        } else {
            hasMore = false;
        }
    }

    const counts = {};
    allProducts.forEach(p => {
        const c = p.category || 'NULL';
        counts[c] = (counts[c] || 0) + 1;
    });

    console.log('--- Total Counts by Category ---');
    console.log(JSON.stringify(counts, null, 2));
}

verify();
