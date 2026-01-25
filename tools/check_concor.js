const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkConcor() {
    console.log('🔍 Checking for "Concor" in DB...');
    const { data, error } = await supabase
        .from('products')
        .select('id, name, active_ingredient, classification')
        .ilike('name', '%Concor%');

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data.length > 0) {
        console.log(`✅ FOUND ${data.length} Concor products:`);
        data.forEach(p => console.log(`   - ${p.name} (${p.active_ingredient || 'No active ingredient'})`));
    } else {
        console.log('⚠️ "Concor" NOT FOUND yet.');
    }
}

checkConcor();
