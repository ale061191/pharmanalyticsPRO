
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('--- Checking Harvest Status ---');

    // 1. Total Product Count
    const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting products:', countError);
    } else {
        console.log(`Total Products in DB: ${count}`);
    }

    // 2. Search for specific terms
    // User asked for: "Dol", "Dol Kids", "Dol Plus", "Concor", "Merck" (as lab)
    const productTerms = ['Dol', 'Dol Kids', 'Dol Plus', 'Concor'];

    for (const term of productTerms) {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, brand')
            .ilike('name', `%${term}%`)
            .limit(5);

        if (error) {
            console.error(`Error searching for ${term}:`, error);
        } else {
            console.log(`\nResults for Product "${term}" (First 5):`);
            if (!data || data.length === 0) {
                console.log('  No results found.');
            } else {
                data.forEach(p => console.log(`  - ${p.name} (${p.brand})`));
            }
        }
    }

    // 3. Search for Lab "Merck" (using 'brand' column)
    console.log('\nResults for Lab "Merck" (First 5):');
    const { data: merckData, error: merckError } = await supabase
        .from('products')
        .select('id, name, brand')
        .ilike('brand', '%Merck%')
        .limit(5);

    if (merckError) {
        console.error('Error searching for Merck:', merckError);
    } else {
        if (!merckData || merckData.length === 0) {
            console.log('  No results found.');
        } else {
            merckData.forEach(p => console.log(`  - ${p.name} (${p.brand})`));
        }
    }
}

checkStatus();
