/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INGEST ATC REFERENCE DATA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Reads 'data/atc_reference.csv' and inserts/upserts into Supabase 'atc_reference'.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const CSV_PATH = path.join(__dirname, '..', 'data', 'atc_reference.csv');

async function ingest() {
    const records = [];
    console.log(`📖 Reading CSV from ${CSV_PATH}...`);

    fs.createReadStream(CSV_PATH)
        .pipe(csv())
        .on('data', (data) => {
            records.push({
                atc_code: data.atc_code.trim(),
                atc_name: data.atc_name.trim(),
                ddd: data.ddd !== 'NA' ? data.ddd : null,
                uom: data.uom !== 'NA' ? data.uom : null,
                adm_r: data.adm_r !== 'NA' ? data.adm_r : null,
                note: data.note !== 'NA' ? data.note : null
            });
        })
        .on('end', async () => {
            console.log(`✅ Parsed ${records.length} records.`);

            // Deduplicate by atc_code to avoid PK/Unique constraints
            // We want the NAME mainly.
            const uniqueRecords = new Map();
            records.forEach(r => {
                if (!uniqueRecords.has(r.atc_code)) {
                    uniqueRecords.set(r.atc_code, r);
                }
            });

            const finalBatch = Array.from(uniqueRecords.values());
            console.log(`✨ Deduplicated to ${finalBatch.length} unique codes.`);

            // Batch insert
            const BATCH_SIZE = 1000;
            for (let i = 0; i < finalBatch.length; i += BATCH_SIZE) {
                const batch = finalBatch.slice(i, i + BATCH_SIZE);
                console.log(`   Upserting batch ${i} to ${i + batch.length}...`);

                // Assuming atc_code is a unique key or we rely on just inserting
                // Better to upsert if atc_code is unique. 
                // If it's not unique in DB, we might get duplicates, but we deduplicated in JS.
                const { error } = await supabase
                    .from('atc_reference')
                    .upsert(batch, { onConflict: 'atc_code' });

                if (error) {
                    console.error('   ❌ Error:', error);
                }
            }
            console.log('🏁 Ingestion complete.');
        });
}

ingest();
