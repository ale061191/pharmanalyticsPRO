const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
    console.log('--- Products Table Columns ---');
    // We can't easily "describe" table via JS client without RPC or just fetching a row and looking at keys
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (products && products.length > 0) {
        const keys = Object.keys(products[0]).sort();
        const output = `Products Columns:\n${keys.join('\n')}\n\nSample:\natc: ${products[0].atc}\ncategory: ${products[0].category}`;
        require('fs').writeFileSync('schema_output.txt', output);
    }

    console.log('\n--- ATC Reference Table Columns ---');
    const { data: refs } = await supabase
        .from('atc_reference')
        .select('*')
        .limit(1);

    if (refs && refs.length > 0) {
        const keys = Object.keys(refs[0]).sort();
        const output = `ATC Reference Columns:\n${keys.join('\n')}\n`;
        require('fs').appendFileSync('schema_output.txt', '\n' + output);
    }
}

checkSchema();
