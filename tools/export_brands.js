const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportBrands() {
    console.log('Fetching all brands...');

    // Using a recursive fetch or large limit
    let allBrands = new Set();
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('products')
            .select('brand')
            .not('brand', 'is', null)
            .neq('brand', 'Unknown')
            .neq('brand', 'N/A')
            .neq('brand', 'Genérico')
            .neq('brand', 'Sin Marca')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching brands:', error);
            break;
        }

        if (data.length === 0) break;

        data.forEach(p => {
            if (p.brand) allBrands.add(p.brand.trim());
        });

        console.log(`Fetched page ${page}, total distinct so far: ${allBrands.size}`);
        page++;
    }

    const sortedBrands = Array.from(allBrands).sort();
    fs.writeFileSync('all_unique_brands.json', JSON.stringify(sortedBrands, null, 2));
    console.log(`Exported ${sortedBrands.length} unique brands to all_unique_brands.json`);
}

exportBrands();
