const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { timeout: 5000 }
});

async function checkStatus() {
    console.log('CHECKING STATUS (Counts per Day)...');

    // Count for Jan 27 using snapshot_date
    const { count: count27, error: error27 } = await supabase
        .from('sales_snapshot')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', '2026-01-27');

    if (error27) console.log('Error checking Jan 27: ' + error27.message);
    else console.log('Snapshots on Jan 27: ' + count27);

    // Count for Jan 28
    const { count: count28, error: error28 } = await supabase
        .from('sales_snapshot')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', '2026-01-28');

    if (error28) console.log('Error checking Jan 28: ' + error28.message);
    else console.log('Snapshots on Jan 28: ' + count28);
}

checkStatus();
