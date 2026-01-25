const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
    console.log('🔍 Checking `products` table columns...');

    // Fetch one row to inspect keys
    const { data, error } = await supabase.from('products').select('*').limit(1);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('⚠️ Table is empty, cannot infer columns from data.');
        return;
    }

    console.log('✅ Columns found in data:');
    console.log(Object.keys(data[0]).join('\n'));
}

checkColumns();
