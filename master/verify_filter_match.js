
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFilter() {
    console.log('Verifying count with ORIGINAL FILTER...');

    let count = 0;
    const PAGE_SIZE = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        const { data: products, error } = await supabase
            .from('products')
            .select('id')
            .or('category.ilike.%medicamento%,department.ilike.%salud%,department.ilike.%medicamento%')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
            console.error('Error', error);
            break;
        }

        if (products && products.length > 0) {
            count += products.length;
            if (products.length < PAGE_SIZE) hasMore = false;
            else page++;
        } else {
            hasMore = false;
        }
    }

    console.log(`Total items matching filter: ${count}`);
}

verifyFilter();
