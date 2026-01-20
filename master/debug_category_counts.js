
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function countCategories() {
    console.log('Counting products with stock > 0 by category...');

    const { data, error } = await supabase
        .from('products')
        .select('category, id')
        .gt('stores_with_stock', 0); // Active products only

    if (error) {
        console.error(error);
        return;
    }

    const counts = {};
    data.forEach(p => {
        const cat = p.category || 'Unknown';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    console.log('--- Counts by Category (Active Products) ---');
    Object.keys(counts).forEach(cat => {
        console.log(`${cat}: ${counts[cat]}`);
    });
}

countCategories();
