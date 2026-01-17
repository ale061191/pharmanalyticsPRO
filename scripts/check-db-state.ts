
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function checkDbState() {
    console.log('Checking database state for problematic items...');

    // Terms to search for in the "name" column
    const terms = ['JL Pharma', 'Spervend', 'Bio-Mercy'];

    for (const term of terms) {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, lab_name, avg_price, url')
            .ilike('name', `%${term}%`)
            .limit(5);

        if (error) {
            console.error(`Error searching for ${term}:`, error);
        } else {
            console.log(`\nResults for "${term}":`);
            if (data.length === 0) console.log('  No products found with this EXACT name.');
            data.forEach((p: any) => {
                console.log(`  - ID: ${p.id}`);
                console.log(`    Name: "${p.name}"`);
                console.log(`    Lab: "${p.lab_name}"`);
                console.log(`    Price: ${p.avg_price}`);
                console.log(`    URL: ${p.url}`);
            });
        }
    }
}

checkDbState();
