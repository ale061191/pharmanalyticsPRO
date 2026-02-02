const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeLabs() {
    console.log('🔬 Analyzing Laboratory Data Coverage...');

    // Get ALL Products
    let allProducts = [];
    let from = 0;
    const BATCH = 1000;

    process.stdout.write('   Fetching products... ');
    for (let i = 0; i < 15; i++) {
        const to = from + BATCH - 1;
        const { data: products, error } = await supabase
            .from('products')
            .select('id, brand')
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

    const total = allProducts.length;
    let knownCount = 0;
    let unknownCount = 0;
    const labCounts = {};

    allProducts.forEach(p => {
        const lab = p.brand;
        const isUnknown = !lab || lab === 'Desconocido' || lab.trim() === '';

        if (isUnknown) {
            unknownCount++;
        } else {
            knownCount++;
            const cleanLab = lab.trim();
            labCounts[cleanLab] = (labCounts[cleanLab] || 0) + 1;
        }
    });

    console.log(`\n\n📊 Results:`);
    console.log(`   - Total Products: ${total}`);
    console.log(`   - With Valid Lab: ${knownCount} (${total > 0 ? ((knownCount / total) * 100).toFixed(1) : 0}%)`);
    console.log(`   - Unknown Lab:    ${unknownCount} (${total > 0 ? ((unknownCount / total) * 100).toFixed(1) : 0}%)`);

    const sortedLabs = Object.entries(labCounts).sort((a, b) => b[1] - a[1]);

    console.log('\n🏆 Top 20 Laboratories:');
    sortedLabs.slice(0, 20).forEach(([lab, count]) => {
        console.log(`   - ${lab}: ${count}`);
    });
}

analyzeLabs();
