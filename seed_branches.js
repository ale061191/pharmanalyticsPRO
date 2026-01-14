const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FARM_LOCATIONS = [
    // Caracas
    // Caracas - Libertador (Density Boost)
    { name: 'Farmatodo La Candelaria', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Urdaneta, La Candelaria', lat: 10.5061, lng: -66.9038 },
    { name: 'Farmatodo Catia', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Sucre, Catia', lat: 10.5135, lng: -66.9380 },
    { name: 'Farmatodo El Valle', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Intercomunal de El Valle', lat: 10.4687, lng: -66.9068 },
    { name: 'Farmatodo Los Chaguaramos', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Las Ciencias', lat: 10.4851, lng: -66.8927 },
    { name: 'Farmatodo Santa Mónica', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Teresa de la Parra', lat: 10.4785, lng: -66.9022 },
    { name: 'Farmatodo El Paraíso', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Páez, El Paraíso', lat: 10.4856, lng: -66.9333 },
    { name: 'Farmatodo Montalbán', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Teherán, Montalbán', lat: 10.4700, lng: -66.9500 },
    { name: 'Farmatodo San Martín', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. San Martín', lat: 10.4980, lng: -66.9250 },
    { name: 'Farmatodo Quinta Crespo', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Final Av. Baralt', lat: 10.4950, lng: -66.9150 },
    { name: 'Farmatodo La Yaguara', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Principal de La Yaguara', lat: 10.4750, lng: -66.9600 },
    { name: 'Farmatodo Caricuao', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Principal de Caricuao', lat: 10.4400, lng: -66.9700 },
    { name: 'Farmatodo Antímano', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Intercomunal de Antímano', lat: 10.4600, lng: -66.9750 },
    { name: 'Farmatodo Macarao', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Carretera Vieja Los Teques', lat: 10.4200, lng: -67.0000 },
    { name: 'Farmatodo 23 de Enero', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Zona Central', lat: 10.5100, lng: -66.9200 },

    // Previous standard branches (Ensure unique names or upsert handles it)
    { name: 'Farmatodo Las Mercedes', city: 'Caracas', state: 'Miranda', municipality: 'Baruta', address: 'Av. Principal de Las Mercedes', lat: 10.4827, lng: -66.8660 },
    { name: 'Farmatodo La Florida', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Los Mangos, La Florida', lat: 10.5000, lng: -66.8750 },
    { name: 'Farmatodo Los Palos Grandes', city: 'Caracas', state: 'Miranda', municipality: 'Chacao', address: 'Av. Andrés Bello', lat: 10.4988, lng: -66.8505 },
    { name: 'Farmatodo La Trinidad', city: 'Caracas', state: 'Miranda', municipality: 'Baruta', address: 'Av. Intercomunal La Trinidad', lat: 10.4350, lng: -66.8700 },
    { name: 'Farmatodo El Hatillo', city: 'Caracas', state: 'Miranda', municipality: 'El Hatillo', address: 'Calle La Lagunita', lat: 10.4150, lng: -66.8250 },
    { name: 'Farmatodo Macaracuay', city: 'Caracas', state: 'Miranda', municipality: 'Sucre', address: 'Av. Principal Macaracuay', lat: 10.4800, lng: -66.8100 },
    { name: 'Farmatodo San Bernardino', city: 'Caracas', state: 'Distrito Capital', municipality: 'Libertador', address: 'Av. Panteón', lat: 10.5110, lng: -66.8950 },

    // Valencia
    { name: 'Farmatodo Viñedo', city: 'Valencia', state: 'Carabobo', municipality: 'Valencia', address: 'Av. Bolívar Norte', lat: 10.2000, lng: -68.0000 },
    { name: 'Farmatodo Mañongo', city: 'Valencia', state: 'Carabobo', municipality: 'Naguanagua', address: 'Mañongo', lat: 10.2500, lng: -68.0100 },
    { name: 'Farmatodo San Diego', city: 'Valencia', state: 'Carabobo', municipality: 'San Diego', address: 'Av. Don Julio Centeno', lat: 10.2300, lng: -67.9500 },
    { name: 'Farmatodo Prebo', city: 'Valencia', state: 'Carabobo', municipality: 'Valencia', address: 'Urb. Prebo', lat: 10.2100, lng: -68.0200 },

    // Maracay
    { name: 'Farmatodo Las Delicias', city: 'Maracay', state: 'Aragua', municipality: 'Girardot', address: 'Av. Las Delicias', lat: 10.2660, lng: -67.5800 },
    { name: 'Farmatodo La Encrucijada', city: 'Maracay', state: 'Aragua', municipality: 'Mariño', address: 'C.C. Regional', lat: 10.2200, lng: -67.4500 },

    // Barquisimeto
    { name: 'Farmatodo Del Este', city: 'Barquisimeto', state: 'Lara', municipality: 'Iribarren', address: 'Av. Lara', lat: 10.0650, lng: -69.3000 },
    { name: 'Farmatodo Avenida Venezuela', city: 'Barquisimeto', state: 'Lara', municipality: 'Iribarren', address: 'Av. Venezuela con Bracamonte', lat: 10.0700, lng: -69.3200 },

    // Maracaibo
    { name: 'Farmatodo Bella Vista', city: 'Maracaibo', state: 'Zulia', municipality: 'Maracaibo', address: 'Av. Bella Vista', lat: 10.6600, lng: -71.6000 },
    { name: 'Farmatodo 5 de Julio', city: 'Maracaibo', state: 'Zulia', municipality: 'Maracaibo', address: 'Calle 77', lat: 10.6500, lng: -71.6200 },
    { name: 'Farmatodo Delicias Norte', city: 'Maracaibo', state: 'Zulia', municipality: 'Maracaibo', address: 'Av. Delicias', lat: 10.6800, lng: -71.6100 },

    // Lechería
    { name: 'Farmatodo Principal', city: 'Lechería', state: 'Anzoátegui', municipality: 'Urbaneja', address: 'Av. Principal', lat: 10.1800, lng: -64.6800 },
    { name: 'Farmatodo Puerto La Cruz', city: 'Puerto La Cruz', municipality: 'Sotillo', state: 'Anzoátegui', lat: 10.2136, lng: -64.6367, address: 'Av. Municipal' },

    // Maracaibo
    { name: 'Farmatodo Bella Vista', city: 'Maracaibo', municipality: 'Maracaibo', state: 'Zulia', lat: 10.6667, lng: -71.6125, address: 'Av. Bella Vista' },
    { name: 'Farmatodo Delicias Norte', city: 'Maracaibo', municipality: 'Maracaibo', state: 'Zulia', lat: 10.6953, lng: -71.6214, address: 'Av. Delicias' }
];

async function seed() {
    console.log('🌱 Seeding Sucursales...');

    // 1. Run Layout Migration (Simple raw SQL via verify logic or just create if not exists manual check)
    // For simplicity in this script, we'll assume the migration was run manually or we run the DDL here.
    // We'll try to run the insertion directly, assuming table exists. 
    // If we wanted to be robust, we'd read the .sql file and exec it.

    // Let's read the migration file and run it first
    try {
        const migrationSql = fs.readFileSync(path.join(__dirname, 'archivos', 'migration_sucursales.sql'), 'utf8');
        const { error: migError } = await supabase.rpc('exec_sql', { sql: migrationSql });
        // Note: exec_sql RPC might not exist on user's DB unless I created it.
        // If it doesn't exist, we fallback to just doing the Inserts and hoping table exists or using a direct Postgrest call if possible (cant do DDL easily without RPC).
        // Given previous context, I might NOT have an exec_sql RPC.
        // So I will likely need to rely on the user running the migration OR
        // I can try to use the raw SQL endpoint if I built one. I built 'src/app/api/run-migration'.
        // I can fetch that endpoint? No, this is a node script.

        // FALLBACK: Just try to insert. If it fails, I'll tell user to run SQL.
        // But wait, I can use the standard supabase client to upsert.
    } catch (err) {
        console.log('Skipping migration execution in script (RPC might be missing).');
    }

    // 2. Insert Data
    // We cannot use upsert(..., { onConflict: 'name' }) unless there is a UNIQUE constraint on 'name'.
    // The migration adds UNIQUE(name), but if it wasn't run or table pre-existed, it might fail.
    // We'll try a simple insert, ignoring duplicates if possible or manually checking.

    // Let's check if they exist first (slow but safe for seed)
    // Let's check if they exist first (slow but safe for seed)
    for (const branch of FARM_LOCATIONS) {
        // Map to legacy columns if they exist (just send both)
        const payload = {
            ...branch,
            latitude: branch.lat,
            longitude: branch.lng
        };

        const { data: existing } = await supabase.from('sucursales').select('id').eq('name', branch.name).single();
        if (!existing) {
            const { error: insertError } = await supabase.from('sucursales').insert(payload);
            if (insertError) console.error(`Failed to insert ${branch.name}:`, insertError.message);
            else console.log(`Inserted ${branch.name}`);
        } else {
            // Update cords if needed
            await supabase.from('sucursales').update(payload).eq('id', existing.id);
            console.log(`Updated ${branch.name}`);
        }
    }
}

seed();
