const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProgress() {
    console.log('🕵️ checking latest imports...');

    // Check latest products added
    const { data: latest, error } = await supabase
        .from('products')
        .select('name, updated_at, classification')
        .order('updated_at', { ascending: false })
        .limit(10);

    if (error) console.error(error);
    else {
        console.log('🕒 Recent Insertions:');
        latest.forEach(p => console.log(`   ${p.updated_at} - ${p.name} (${p.classification || 'N/A'})`));
    }
}

checkProgress();
