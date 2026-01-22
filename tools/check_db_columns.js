require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkColumns() {
    console.log('🔍 Checking database columns...');

    // Try to select the new columns from one record
    const { data, error } = await supabase
        .from('products')
        .select('id, is_pharma, classification, active_ingredient')
        .limit(1);

    if (error) {
        console.log('❌ Columns likely missing. Error:', error.message);
        console.log('💡 Recommendation: Run SQL migration.');
    } else {
        console.log('✅ Columns exist!');
        console.log('Sample:', data);
    }
}

checkColumns();
