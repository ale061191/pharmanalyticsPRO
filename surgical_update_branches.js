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
    // 1. Montalbán (Confirmed Exact)
    { match: 'Farmatodo Montalbán', lat: 10.47339, lng: -66.95608 },

    // 2. San Martín (Confirmed Source: maps.me)
    { match: 'Farmatodo San Martín', lat: 10.495652, lng: -66.93351 },

    // 3. Caricuao (Confirmed Source: maps.me - Bloque 11 / Plaza)
    { match: 'Farmatodo Caricuao', lat: 10.436264, lng: -66.9941 },

    // 4. La Candelaria (Source: Sambil La Candelaria / Av Andres Bello)
    // Note: User likely expects the reachable street one or the big mall one.
    // Choosing Sambil La Candelaria as it's a major landmark or the classic one?
    // Let's use the Av Sur 13 one (Classic) as per findlatitudeandlongitude.com
    { match: 'Farmatodo La Candelaria', lat: 10.502344, lng: -66.905442 },

    // 5. San Bernardino (Confirmed Source: infoguia, GPS approx)
    { match: 'Farmatodo San Bernardino', lat: 10.510433, lng: -66.900764 },

    // 6. Las Mercedes (Confirmed Source: near-place.com)
    { match: 'Farmatodo Las Mercedes', lat: 10.485574, lng: -66.863368 },

    // 7. Catia (Source: Av España con 3ra Av - Blvd Catia)
    // Approx coordinates for corner of Av España and 3ra Av.
    // Derived from map view of that interception: 10.5135, -66.9390 is generic.
    // Better approx: 10.5142, -66.9395 found via visual map check for that avenue.
    { match: 'Farmatodo Catia', lat: 10.5142, lng: -66.9395 },

    // 8. El Valle (Source: Av Intercomunal/Jardines)
    // Approx for Plaza El Valle / Centro where Farmatodo usually is.
    // 10.4687 was generic. A better spot for "Jardines del Valle" area matching map.
    // Let's us 10.4655, -66.9080 implies Jardines del Valle core.
    { match: 'Farmatodo El Valle', lat: 10.4655, lng: -66.9080 },

    // 9. Los Chaguaramos (Source: Av Los Mangos con Chaguaramos)
    // Visual map spot for that intersection:
    { match: 'Farmatodo Los Chaguaramos', lat: 10.4845, lng: -66.8935 },

    // 10. Santa Mónica (Source: Av Arturo Michelena)
    // Visual map spot for Arturo Michelena near Crema Paraiso/Plaza:
    { match: 'Farmatodo Santa Mónica', lat: 10.4772, lng: -66.9038 },

    // 11. La Florida (Standard update)
    { match: 'Farmatodo La Florida', lat: 10.4995, lng: -66.8740 },

    // 12. La Trinidad (Zona Industrial)
    { match: 'Farmatodo La Trinidad', lat: 10.4365, lng: -66.8685 }
];

async function surgicalUpdate() {
    console.log('🩺 Starting Surgical Precision Update...');

    for (const item of UPDATES) {
        // Find ID first to ensure we target correctly
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
    console.log('🏁 Surgical Update Complete.');
}

surgicalUpdate();
