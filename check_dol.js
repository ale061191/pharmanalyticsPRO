
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDol() {
    const terms = ['Dol Kids', 'Dol Plus'];
    for (const term of terms) {
        const { data } = await supabase.from('products').select('name').ilike('name', `%${term}%`).limit(3);
        console.log(`\n${term}:`);
        data?.forEach(p => console.log(`- ${p.name}`));
    }
}
checkDol();
