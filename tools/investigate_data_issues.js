const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function investigate() {
    let output = '';
    const log = (msg) => { console.log(msg); output += msg + '\n'; };

    log('🔍 Investigating Data Quality...');

    // 1. Search for "Concor" (Bisoprolol)
    log('\n--- Searching for "Concor" ---');
    const { data: concor, error: errorConcor } = await supabase
        .from('products')
        .select('id, name, clean_name, active_ingredient, is_pharma')
        .or('name.ilike.%Concor%,clean_name.ilike.%Concor%,active_ingredient.ilike.%Bisoprolol%');

    if (errorConcor) log('Error searching Concor: ' + JSON.stringify(errorConcor));
    else if (!concor || concor.length === 0) log('❌ "Concor" NOT FOUND in database.');
    else {
        log(`✅ Found ${concor.length} matches for Concor/Bisoprolol:`);
        concor.forEach(p => log(JSON.stringify(p, null, 2)));
    }

    // 2. Search for "Chocolate" / "Yoga"
    log('\n--- Searching for "Chocolate" / "Yoga" ---');
    const { data: junk, error: errorJunk } = await supabase
        .from('products')
        .select('id, name, clean_name, is_pharma')
        .or('name.ilike.%chocolate%,name.ilike.%tapete%,name.ilike.%yoga%')
        .limit(5);

    if (errorJunk) log('Error searching junk: ' + JSON.stringify(errorJunk));
    else {
        log(`⚠️ Found ${junk.length} junk items (Sample):`);
        junk.forEach(p => log(JSON.stringify(p)));
    }

    fs.writeFileSync('investigation_results.txt', output);
}

investigate();
