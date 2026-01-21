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

            // Batch insert
            const BATCH_SIZE = 1000;
            for (let i = 0; i < records.length; i += BATCH_SIZE) {
                const batch = records.slice(i, i + BATCH_SIZE);
                console.log(`   Inserting batch ${i} to ${i + batch.length}...`);

                const { error } = await supabase
                    .from('atc_reference')
                    .insert(batch);
                // Actually id is PK, atc_code might repeat for different DDDs? 
                // Let's check CSV. A01AA has multiple rows? 
                // "A01AA,Caries prophylactic agents"
                // Usually code is unique for the name, but rows generally unique.
                // Let's just insert.

                if (error) {
                    console.error('   ❌ Error:', error);
                }
            }
            console.log('🏁 Ingestion complete.');
        });
}

ingest();
