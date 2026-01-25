const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const INPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/WAVE2_CLASSIFIED.json');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase keys.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('🔗 Syncing Wave 2 Classification to Database...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Classification file not found. Wait for classification script.');
        return;
    }

    const products = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`📦 Loaded ${products.length} classified products.`);

    let validUpdates = products.filter(p => p.is_pharma !== undefined).map(p => ({
        id: p.id,
        clean_name: p.clean_name || p.nombre_limpio,
        active_ingredient: p.active_ingredient || null,
        presentation: p.presentation || null,
        is_pharma: p.is_pharma,
        classification: p.tipo_producto || 'UNKNOWN'
    }));

    console.log(`🚀 Sending ${validUpdates.length} updates to Supabase...`);

    const BATCH_SIZE = 100;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < validUpdates.length; i += BATCH_SIZE) {
        const batch = validUpdates.slice(i, i + BATCH_SIZE);

        const { error } = await supabase
            .from('products')
            .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

        if (error) {
            console.error(`❌ Batch error ${i}: ${error.message}`);
            errors += batch.length;
        } else {
            updated += batch.length;
            process.stdout.write(`\r✅ Syncing: ${updated}/${validUpdates.length}`);
        }
    }

    console.log(`\n✨ Sync Complete! Updated: ${updated}, Errors: ${errors}`);
}

main();
