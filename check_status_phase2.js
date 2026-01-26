
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('--- Phase 2 Status ---');

    // 1. Total Product Count
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`Total Products: ${count}`);

    // 2. Search for Dol Kids / Dol Plus
    const terms = ['Dol Kids', 'Dol Plus', 'Dol'];

    for (const term of terms) {
        const { data } = await supabase
            .from('products')
            .select('name, brand')
            .ilike('name', `%${term}%`)
            .limit(5);

        if (data && data.length > 0) {
            console.log(`\nResults for "${term}":`);
            data.forEach(p => console.log(`  - ${p.name}`));
        } else {
            console.log(`\nResults for "${term}": None`);
        }
    }
}

checkStatus();
