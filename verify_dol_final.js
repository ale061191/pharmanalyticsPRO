
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDol() {
    console.log('--- FINAL VALIDATION: Dol Kids / Dol Plus ---');

    const { data, error } = await supabase
        .from('products')
        .select('id, name, brand')
        .or('name.ilike.%Dol Kids%,name.ilike.%Dol Plus%');

    if (error) console.error(error);
    else {
        console.log(`Found ${data.length} matches:`);
        data.forEach(p => console.log(`✅ ${p.name}`));
    }
}
verifyDol();
