const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCardio() {
    console.log('❤️ Checking Cardiology/Hypertension products...');

    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .or('classification.ilike.%cardiologia%,classification.ilike.%hipertension%,active_ingredient.ilike.%losartan%,active_ingredient.ilike.%candesartan%');

    if (error) {
        console.error('❌ Error checking cardio:', error);
        return;
    }

    console.log(`✅ Found ${count} potential Cardiology products so far.`);
}

checkCardio();
