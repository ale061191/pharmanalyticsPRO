const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listLabs() {
    console.log('🔬 Listing Unique Laboratories...');

    // Get ALL Products
    let allProducts = [];
    let from = 0;
    const BATCH = 1000;

    process.stdout.write('   Fetching products... ');
    for (let i = 0; i < 15; i++) {
        const to = from + BATCH - 1;
        const { data: products, error } = await supabase
            .from('products')
            .select('brand')
            .range(from, to);

        if (error) {
            console.error('Error:', error);
            break;
        }
        if (!products || products.length === 0) break;

        process.stdout.write(`${products.length}... `);
        allProducts = allProducts.concat(products);

        if (products.length < BATCH) break;
        from += BATCH;
    }

    const labCounts = {};
    allProducts.forEach(p => {
        const lab = p.brand;
        const cleanLab = (!lab || lab === 'Desconocido' || lab.trim() === '') ? null : lab.trim();

        if (cleanLab) {
            labCounts[cleanLab] = (labCounts[cleanLab] || 0) + 1;
        }
    });

    const sortedLabs = Object.entries(labCounts).sort((a, b) => b[1] - a[1]);
    console.log(`\n\n✅ Found ${sortedLabs.length} unique laboratories.`);

    // Save full list to file
    const report = sortedLabs.map(([lab, count]) => `${lab} (${count} productos)`).join('\n');
    fs.writeFileSync('laboratorios_encontrados.txt', report);
    console.log('📄 List saved to: laboratorios_encontrados.txt');
}

listLabs();
