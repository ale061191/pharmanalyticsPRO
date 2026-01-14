
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

async function checkData() {
    console.log("--- Checking Product ---");
    const { data: product, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('id', 'a9e9d05a-8f8a-4f33-8f05-24381a70da1e')
        .single();

    if (pError) console.error("Product Error:", pError.message);
    else console.log("Product in DB:", { name: product.name, url: product.url });

    console.log("\n--- Checking Stock Detail ---");
    const { data: stocks, error: sError } = await supabase
        .from('stock_detail')
        .select('product_name, city, stock_count')
        .order('scraped_at', { ascending: false })
        .limit(10);

    if (sError) console.error("Stock Detail Error:", sError.message);
    else {
        console.log(`Found ${stocks.length} entries. Examples:`);
        stocks.forEach(s => console.log(`- [${s.product_name}] ${s.city}: ${s.stock_count}`));
    }
}

checkData();
