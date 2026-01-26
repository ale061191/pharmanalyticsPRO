
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    console.log('--- Inspecting Table Structure ---');

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching row:', error);
    } else if (data && data.length > 0) {
        console.log('Sample Row Keys:', Object.keys(data[0]));
    } else {
        console.log('Table is empty.');
    }
}

inspectTable();
