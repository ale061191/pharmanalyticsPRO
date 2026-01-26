
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function monitor() {
    console.log('👀 Monitoring for Dol Kids / Dol Plus...');
    const start = Date.now();
    const maxTime = 60000; // Run for 60 seconds

    while (Date.now() - start < maxTime) {
        const { data } = await supabase
            .from('products')
            .select('name, brand')
            .or('name.ilike.%Dol Kids%,name.ilike.%Dol Plus%,name.ilike.%Dol%')
            .limit(10);

        const targets = data?.filter(p =>
            p.name.match(/Dol\s*Kids/i) || p.name.match(/Dol\s*Plus/i)
        );

        if (targets && targets.length > 0) {
            console.log('\n✅ FOUND TARGETS!');
            targets.forEach(p => console.log(`   - ${p.name} (${p.brand})`));
            return;
        } else if (data && data.length > 0) {
            // Just show receiving regular "Dol" items to show progress
            console.log(`   (Found ${data.length} 'Dol' items, but not Kids/Plus yet...)`);
        } else {
            process.stdout.write('.');
        }

        await new Promise(r => setTimeout(r, 5000));
    }
    console.log('\n⏳ Time up. Still searching...');
}

monitor();
