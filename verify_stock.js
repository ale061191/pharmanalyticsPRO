const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verifyStock() {
    console.log('🕵️ Verificando Stock en Farmatodo Montalbán...');

    const { data, error } = await supabase
        .from('stock_detail')
        .select('product_name, lab_name, stock_count, store_name')
        .ilike('store_name', '%Montalbán%') // Case insensitive match for store
        .ilike('lab_name', '%Genven%')      // Cas insensitive match for lab
        .ilike('product_name', '%Ibuprofeno%'); // Match Ibuprofeno products

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ No se encontraron registros de Ibuprofeno Genven en Montalbán.');
    } else {
        console.log('✅ Registros Encontrados:');
        data.forEach(item => {
            console.log(`- ${item.product_name} (${item.lab_name}): ${item.stock_count} unidades`);
        });
    }
}

verifyStock();
