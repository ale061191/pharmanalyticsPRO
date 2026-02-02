const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSnapshots() {
    console.log('🔍 Checking Sales Snapshots for Jan 28 & Jan 29...');

    const dates = ['2026-01-28', '2026-01-29'];

    for (const date of dates) {
        const { count, error } = await supabase
            .from('sales_snapshot')
            .select('*', { count: 'exact', head: true })
            .eq('snapshot_date', date);

        if (error) {
            console.error(`❌ Error checking ${date}:`, error.message);
        } else {
            console.log(`✅ Snapshots on ${date}: ${count}`);
            if (count > 5000) {
                console.log(`   -> Status: SUCCESS (Normal volume)`);
            } else if (count > 0) {
                console.log(`   -> Status: PARTIAL? (Low volume)`);
            } else {
                console.log(`   -> Status: FAILED / NOT RUN`);
            }
        }
    }
}

checkSnapshots();
