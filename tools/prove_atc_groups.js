const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function prove() {
    const letters = ['A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V'];

    for (const char of letters) {
        const { count, error } = await supabase
            .from('atc_reference')
            .select('*', { count: 'exact', head: true })
            .ilike('atc_code', `${char}%`);

        console.log(`Group ${char}: ${count} codes`);
    }
}

prove();
