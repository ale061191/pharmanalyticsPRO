const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateSucursales() {
    console.log('Iniciando carga de sucursales...');

    try {
        const citiesData = JSON.parse(fs.readFileSync('master/cities.json', 'utf8'));
        const storesData = JSON.parse(fs.readFileSync('master/stores.json', 'utf8'));

        console.log(`Cargando ${citiesData.length} ciudades y ${storesData.length} tiendas...`);

        // Prepare data for insertion
        // Assuming table 'sucursales' has columns matching the API or we map them.
        // Based on previous conversations, schema might be simple.
        // Let's inspect storesData structure from logs or assumption.
        // API response likely has: id, name, address, city_id, etc.
        // We will map basic fields.

        const sucursales = storesData.map(store => ({
            id: store.id, // Assuming ID is preserved
            nombre: store.name || store.alias,
            direccion: store.address,
            ciudad: citiesData.find(c => c.id === store.cityId)?.name || 'Unknown',
            estado: 'Venezuela', // Hardcoded for now
            latitud: store.latitude,
            longitud: store.longitude,
            active: true
        }));

        // Upsert
        const { data, error } = await supabase
            .from('sucursales')
            .upsert(sucursales, { onConflict: 'id' });

        if (error) throw error;

        console.log(`✅ Sucursales insertadas/actualizadas: ${sucursales.length}`);

    } catch (error) {
        console.error('Error en carga de sucursales:', error.message);
    }
}

populateSucursales();
