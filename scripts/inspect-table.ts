
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function inspect() {
    const { data } = await supabase.from('products').select('*').limit(1);
    if (data && data.length) {
        console.log('--- KEYS START ---');
        console.log(Object.keys(data[0]).join('\n'));
        console.log('--- KEYS END ---');
        console.log('ID Sample:', data[0].id);
        console.log('Name Sample:', data[0].name);
    } else {
        console.log('No data');
    }
}
inspect();
