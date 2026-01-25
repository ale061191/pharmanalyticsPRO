const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDol() {
    console.log('💊 Checking for products starting with "Dol"...');

    const { data, error } = await supabase
        .from('products')
        .select('id, name, clean_name')
        .ilike('name', '%dol%')
        .limit(20);

    if (error) {
        console.error('❌ Error checking matches:', error);
        return;
    }

    if (data.length === 0) {
        console.log('⚠️ No products found starting with "Dol".');
    } else {
        console.log(`✅ Found ${data.length} matches:`);
        data.forEach(p => console.log(`   - ${p.name} (Clean: ${p.clean_name})`));
    }
}

checkDol();
