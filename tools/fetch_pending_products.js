require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fetchPending() {
    console.log("🔍 Fetching products with clean_name IS NULL...");

    // Fetch all rows where clean_name is null. 
    // Since we have ~7k, we can fetch all in one go or pagination. Supabase limit is usually 1000.
    // We'll use a loop to be safe.

    let allProducts = [];
    const PAGE_SIZE = 1000;
    let from = 0;
    let to = PAGE_SIZE - 1;
    let active = true;

    while (active) {
        const { data, error, count } = await supabase
            .from('products')
            .select('id, name, brand, active_ingredient', { count: 'exact' })
            .is('clean_name', null)
            .range(from, to);

        if (error) {
            console.error("Error fetching:", error);
            break;
        }

        if (data.length === 0) {
            active = false;
        } else {
            allProducts = allProducts.concat(data);
            console.log(`Fetched ${from} - ${from + data.length} (Total: ${allProducts.length})`);
            from += PAGE_SIZE;
            to += PAGE_SIZE;
        }
    }

    console.log(`✅ Total Pending Found: ${allProducts.length}`);

    const outputPath = path.join(__dirname, '../Farmatodo_Reverse/WAVE2_RAW.json');
    fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2));
    console.log(`💾 Saved to ${outputPath}`);
}

fetchPending();
