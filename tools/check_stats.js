const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getCounts() {
    console.log('📊 Counting Products...');

    // Total count
    const { count: total, error: err1 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    // Pharma count
    const { count: pharma, error: err2 } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_pharma', true);

    if (err1 || err2) {
        console.error('❌ Error counting:', err1 || err2);
        return;
    }

    console.log(`✅ Total Products: ${total}`);
    console.log(`💊 Pharma Products: ${pharma}`);
    console.log(`🗑️ Non-Pharma/Other: ${total - pharma}`);
}

getCounts();
