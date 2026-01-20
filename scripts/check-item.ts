
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkItem() {
    // Specific ID from previous log: bf2a6a5c-fc4b-4926-9d08-8353ff9f43ae (Spervend)
    const { data } = await supabase.from('products').select('*').eq('id', 'bf2a6a5c-fc4b-4926-9d08-8353ff9f43ae').single();
    console.log(JSON.stringify(data, null, 2));
}
checkItem();
