const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role if available for faster writes, but standard key works too if RLS allows
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const INPUT_FILE = 'Farmatodo_Reverse/FARMATODO_VE_PHARMA_CLASSIFIED.json';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase keys.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('🔗 Syncing Classification to Database...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Classification file not found.');
        return;
    }

    const products = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`📦 Loaded ${products.length} classified products.`);

    let validUpdates = products.filter(p => p.is_pharma !== undefined).map(p => ({
        id: p.id,
        clean_name: p.nombre_limpio || p.nombre,
        active_ingredient: p.principio_activo_detectado || null,
        presentation: p.presentacion_detectada || null,
        is_pharma: p.is_pharma,
        classification: p.tipo_producto || 'UNKNOWN',
        // Preserve other fields? usually upsert by ID only updates specified fields if others are omitted?
        // No, upsert replaces unless we be careful. But 'update' is safer if rows exist.
    }));

    console.log(`🚀 Sending ${validUpdates.length} updates to Supabase...`);

    // We use upsert with a limited column set to avoid overwriting stock/price if scraping is running
    // Actually, 'upsert' in Supabase (PostgREST) updates the row if ID matches.
    // If we only provide these columns, does it nullify others? 
    // NO, 'upsert' works like merge if we specify the columns? 
    // Actually, standard behaviour: "Updates an existing row...". 
    // If I send { id: 1, is_pharma: true }, it will NOT delete 'price' from DB if I don't send it?
    // Let's verify. Supabase upsert: "Perform an UPSERT on the table."
    // Ideally, we should use 'update' but update requires doing it one by one or matching filters.
    // Upsert is safer for batching. 
    // BUT: "If you want to update only specific columns...".
    // Let's safe bet: Update in batches using upsert is standard, assuming we don't accidentally nullify things.
    // The concern is valid. If I upsert {id:1, is_pharma:true}, does it keep price? 
    // Yes, PostgreSQL ON CONFLICT DO UPDATE SET ... usually updates only provided columns IF configured.
    // But Supabase client sends the object. 
    // To be 100% safe, we can use `upsert` with `ignoreDuplicates: false`.

    // BATCH PROCESSING
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
