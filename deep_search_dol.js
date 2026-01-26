
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepSearch() {
    console.log('--- DEEP SEARCH FOR DOL ---');

    // Method 1: ILIKE with wildcards
    const { data: data1 } = await supabase
        .from('products')
        .select('id, name')
        .ilike('name', '%Dol%')
        .limit(50);

    console.log(`Wide Search (%Dol%): Found ${data1?.length || 0}`);
    data1?.forEach(p => {
        if (p.name.toLowerCase().includes('kids') || p.name.toLowerCase().includes('plus')) {
            console.log(`   MATCH FOUND: ${p.name}`);
        }
    });

    // Method 2: Text Search if enabled, or simple array check
    const { data: data2 } = await supabase
        .from('products')
        .select('id, name')
        .textSearch('name', "'Dol' & ('Kids' | 'Plus')");

    console.log(`Text Search: Found ${data2?.length || 0}`);
    data2?.forEach(p => console.log(`   MATCH: ${p.name}`));
}

deepSearch();
