const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seedStock() {
    console.log('💊 Generating Strategic Stock Data...');

    // 1. Get ALL Products (Full Catalog)
    const { data: products } = await supabase.from('products').select('*');

    // 2. Get All Branches
    const { data: branches } = await supabase.from('sucursales').select('*');

    if (!products || !branches) {
        console.error('Missing products or branches');
        return;
    }

    const stockEntries = [];

    // 3. Generate Stock Matrix
    // For each product, we'll assign different stock levels to different cities/branches
    // to simulate "hot zones" and "shortage zones".

    products.forEach((product) => {
        branches.forEach((branch) => {
            // Random logic to create variation
            const randomVal = Math.random();
            let quantity = 0;
            let status = 'none';

            // 95% chance of having the product to avoid "Fake 0s" in demo
            if (randomVal > 0.05) {
                // Simulate geographic variation but keep stock generally available
                if (branch.city === 'Maracaibo') {
                    // Maracaibo has slightly less stock but not zero
                    quantity = Math.floor(Math.random() * 20) + 5; // 5-24
                } else {
                    // Caracas and others have good stock
                    quantity = Math.floor(Math.random() * 80) + 15; // 15-94
                }

                if (quantity > 30) status = 'high';
                else if (quantity > 10) status = 'medium';
                else status = 'low';
            }

            if (quantity > 0) {
                // Synthetic Lab for demo if missing
                const labs = ['Calox', 'Leti', 'Genven', 'Behrens', 'Vivar'];
                const syntheticLab = labs[Math.floor(Math.random() * labs.length)];

                stockEntries.push({
                    product_name: product.name,
                    lab_name: product.lab_name || syntheticLab, // Fallback to ensure filter works
                    city: branch.city,
                    sector: branch.municipality || 'Centro', // Fallback
                    store_name: branch.name,
                    stock_count: quantity,
                    availability_status: status,
                    scraped_at: new Date()
                });
            }
        });
    });

    // 4. Batch Insert
    console.log(`Inserting ${stockEntries.length} stock records...`);

    // Chunking to avoid payload limit
    const chunkSize = 100;
    for (let i = 0; i < stockEntries.length; i += chunkSize) {
        const chunk = stockEntries.slice(i, i + chunkSize);
        const { error } = await supabase.from('stock_detail').insert(chunk);
        if (error) console.error('Error inserting chunk:', error.message);
    }

    console.log('✅ Stock Intelligence Data Loaded!');
}

seedStock();
