const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listProductNames() {
    console.log('📝 fetching product names...');

    let allNames = [];
    let from = 0;
    const BATCH = 1000;

    process.stdout.write('   Fetching... ');
    for (let i = 0; i < 15; i++) {
        const to = from + BATCH - 1;

        // Try 'name' first, if null results, we'll see.
        const { data: products, error } = await supabase
            .from('products')
            .select('name')
            .range(from, to);

        if (error) {
            console.error('Error:', error);
            // If name fails, it might be 'nombre'
            break;
        }

        if (!products || products.length === 0) break;

        process.stdout.write(`${products.length}... `);

        // Extract name safely
        const names = products.map(p => p.name).filter(n => n);
        allNames = allNames.concat(names);

        if (products.length < BATCH) break;
        from += BATCH;
    }

    console.log(`\n\n✅ Extracted ${allNames.length} names.`);

    if (allNames.length === 0) {
        console.log('⚠️ Warning: No names found. Check column name (name vs nombre).');
    }

    const content = allNames.join('\n');
    fs.writeFileSync('productos_farmacologicos.txt', content);
    console.log('📄 Saved to: productos_farmacologicos.txt');
}

listProductNames();
