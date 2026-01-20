
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Checking Tramadol ---');
    const { data } = await supabase.from('products').select('*').ilike('name', 'Tramadol%').limit(1);
    if (data && data[0]) {
        console.log('Name:', data[0].name);
        console.log('Price:', data[0].avg_price);
        console.log('Lab:', data[0].lab_name);
        console.log('Rating:', data[0].rating);
    } else {
        console.log('Tramadol not found');
    }
}
check();
