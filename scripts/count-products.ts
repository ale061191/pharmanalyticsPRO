
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function countProducts() {
    console.log('Counting products in Supabase...');

    // Get total count
    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting products:', error.message);
        return;
    }

    console.log(`\n=== Database Status ===`);
    console.log(`Total Products: ${count}`);

    // Also verify how many have "farmatodo_id" or "url" populated to ensure quality
    const { count: withUrl } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('url', 'is', null);

    console.log(`Products with URL: ${withUrl}`);
}

countProducts();
