
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env: any = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSectors() {
    console.log("--- Checking Unique Sectors in DB ---");
    // Get unique sectors distinct
    const { data, error } = await supabase
        .from('stock_detail')
        .select('city, sector, store_name')
        .limit(50);

    if (error) console.error("Error:", error.message);
    else {
        console.log(`Sample Data (${data.length} rows):`);
        data.forEach(r => console.log(`[${r.city}] Sector: '${r.sector}' | Store: ${r.store_name}`));
    }
}

checkSectors();
