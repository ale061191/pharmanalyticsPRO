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

async function updateMontalban() {
    console.log('📍 Updating Montalbán Coordinates...');

    const { error } = await supabase
        .from('sucursales')
        .update({ lat: 10.47339, lng: -66.95608 })
        .ilike('name', '%Montalbán%');

    if (error) console.error('Error:', error);
    else console.log('✅ Coordinates updated successfully to (10.47339, -66.95608)');
}

updateMontalban();
