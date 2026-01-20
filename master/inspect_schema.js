
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Inspecting schema...");

    const tables = ['sucursales', 'products'];

    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) console.log(`Error ${t}:`, error.message);
        else if (data.length > 0) console.log(`Keys ${t}:`, Object.keys(data[0]));
        else console.log(`${t} is empty.`);
    }
}

inspect();
