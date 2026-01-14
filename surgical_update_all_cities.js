const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const UPDATES = [
    // --- VALENCIA ---
    { match: 'Farmatodo Viñedo', lat: 10.2122, lng: -68.0158 },
    { match: 'Farmatodo Mañongo', lat: 10.2330, lng: -68.0060 }, // Sambil Area
    { match: 'Farmatodo San Diego', lat: 10.2147, lng: -67.9647 }, // Confirmed GPS
    { match: 'Farmatodo Prebo', lat: 10.2085, lng: -68.0210 }, // Approx Prebo/Shopping

    // --- MARACAY ---
    { match: 'Farmatodo Las Delicias', lat: 10.2660, lng: -67.5800 }, // Av Principal
    { match: 'Farmatodo La Encrucijada', lat: 10.2220, lng: -67.4550 }, // CC Regional approx

    // --- BARQUISIMETO ---
    // Confirmed Sambil/Av Venezuela
    { match: 'Farmatodo Avenida Venezuela', lat: 10.0715, lng: -69.2933 },
    { match: 'Farmatodo Del Este', lat: 10.0680, lng: -69.2950 }, // Av Lara approx

    // --- MARACAIBO ---
    { match: 'Farmatodo Bella Vista', lat: 10.6660, lng: -71.6120 }, // Av Bella Vista / Calle 61
    { match: 'Farmatodo 5 de Julio', lat: 10.6550, lng: -71.6180 }, // Calle 77 (5 de Julio)
    { match: 'Farmatodo Delicias Norte', lat: 10.6953, lng: -71.6214 }, // Av Delicias N

    // --- LECHERÍA / PTO LA CRUZ ---
    { match: 'Farmatodo Principal', lat: 10.1861, lng: -64.6592 }, // Confirmed Lechería
    { match: 'Farmatodo Puerto La Cruz', lat: 10.2136, lng: -64.6367 }, // Av Municipal
];

async function surgicalUpdateAll() {
    console.log('🩺 Starting National Surgical Precision Update...');

    for (const item of UPDATES) {
        // Find ID first 
        const { data: branches } = await supabase
            .from('sucursales')
            .select('id, name')
            .ilike('name', `%${item.match}%`);

        if (branches && branches.length > 0) {
            for (const branch of branches) {
                const { error } = await supabase
                    .from('sucursales')
                    .update({ lat: item.lat, lng: item.lng })
                    .eq('id', branch.id);

                if (!error) {
                    console.log(`✅ [UPDATED] ${branch.name} -> (${item.lat}, ${item.lng})`);
                } else {
                    console.error(`❌ [ERROR] ${branch.name}:`, error.message);
                }
            }
        } else {
            console.log(`⚠️ [SKIPPED] No match found for "${item.match}"`);
        }
    }
    console.log('🏁 National Surgical Update Complete.');
}

surgicalUpdateAll();
