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

async function checkIbuprofenoDosage() {
    console.log('💊 Analizando inventario de Ibuprofeno en Farmatodo Montalbán...\n');

    // Fetch all Ibuprofeno products for this store
    const { data, error } = await supabase
        .from('stock_detail')
        .select('product_name, stock_count, lab_name')
        .ilike('store_name', '%Montalbán%')
        .ilike('product_name', '%Ibuprofeno%')
        .order('product_name');

    if (error) {
        console.error('Error fetching data:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No se encontraron productos de Ibuprofeno en esta sucursal.');
        return;
    }

    // Determine dosages strictly from the name string
    // This is a simple categorization based on the product name text
    const dosages = {};

    data.forEach(item => {
        // Try to extra "X mg" or just use the full name if complex
        const name = item.product_name;
        const stock = item.stock_count;

        console.log(`🔹 ${name} (${item.lab_name || 'Sin Lab'}): ${stock} unidades`);
    });
}

checkIbuprofenoDosage();
