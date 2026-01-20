
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkDuplicates() {
    // Check for ANY product with name 'Spervend' or 'JL Pharma'
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('name.eq.Spervend,name.eq.JL Pharma,name.eq.Bio-Mercy');

    if (error) console.error(error);
    else {
        console.log(`Found ${data.length} bad records remaining:`);
        data.forEach(p => console.log(`[${p.id}] Name: "${p.name}" | URL: ${p.url}`));
    }
}
checkDuplicates();
