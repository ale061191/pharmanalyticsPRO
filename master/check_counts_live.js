
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking DB Counts...");

    const { count: products } = await supabase.from('products').select('*', { count: 'exact', head: true });

    // Fetch all sucursales to count unique cities/municipalities
    const { data: stores } = await supabase.from('sucursales').select('city, municipality');

    const uniqueCities = new Set(stores.map(s => s.city?.trim().toUpperCase()));
    const uniqueMunicipalities = new Set(stores.map(s => s.municipality?.trim().toUpperCase()));

    console.log(`\n--- ESTADÍSTICAS DEL SISTEMA ---`);
    console.log(` Productos Totales: ${products}`);
    console.log(` Sucursales: ${stores.length}`);
    console.log(` Ciudades Únicas: ${uniqueCities.size}`);
    console.log(` Municipios Únicos: ${uniqueMunicipalities.size}`);

    const { count: inventory } = await supabase.from('store_inventory').select('*', { count: 'exact', head: true });
    console.log(` Registros de Inventario: ${inventory}`);
    console.log(`-------------------------------\n`);
}

check();
