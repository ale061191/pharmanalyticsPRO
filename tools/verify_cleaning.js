const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verify() {
    console.log('🔍 Verifying Cleaned Products...');

    const { data, error } = await supabase
        .from('products')
        .select('id, name, clean_name, atc_code, active_ingredient, presentation, concentration, brand')
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('⚠️ No cleaned products found yet.');
    } else {
        console.log('✅ Found cleaned products:');
        data.forEach(p => {
            console.log(`\nOriginal: ${p.name}`);
            console.log(`Clean:    ${p.clean_name}`);
            console.log(`ATC:      ${p.atc_code}`);
            console.log(`Active:   ${p.active_ingredient}`);
            console.log(`Pres:     ${p.presentation}`);
            console.log(`Conc:     ${p.concentration}`);
            console.log(`Lab:      ${p.brand}`);
        });
    }
}

verify();
