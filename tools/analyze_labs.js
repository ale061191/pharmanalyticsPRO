const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeLabs() {
    console.log('🔬 Analyzing Laboratory Data Coverage...');

    // 1. Get Total Count
    const { count: total, error: errTotal } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    if (errTotal) {
        console.error('Error fetching total:', errTotal);
        return;
    }

    // 2. Get Count with "Desconocido" or Null
    // We check for 'Desconocido' (our default) or NULL or Empty string
    const { count: unknownCount, error: errUnknown } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .or('laboratorio.eq.Desconocido,laboratorio.is.null,laboratorio.eq.""');

    const { count: knownCount, error: errKnown } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .neq('laboratorio', 'Desconocido')
        .not('laboratorio', 'is', null)
        .neq('laboratorio', '');

    console.log(`\n📊 Results:`);
    console.log(`   - Total Products: ${total}`);
    console.log(`   - With Valid Lab: ${knownCount} (${((knownCount / total) * 100).toFixed(1)}%)`);
    console.log(`   - Unknown Lab:    ${unknownCount} (${((unknownCount / total) * 100).toFixed(1)}%)`);

    // 3. Top Labs
    // Since we can't do group by provided aggregation easily with simple client without RPC, 
    // and fetching 5000 rows is cheap, we'll fetch and count in memory.

    const { data: allProducts } = await supabase
        .from('products')
        .select('laboratorio');

    if (allProducts) {
        const labCounts = {};
        allProducts.forEach(p => {
            const lab = p.laboratorio || 'Desconocido';
            labCounts[lab] = (labCounts[lab] || 0) + 1;
        });

        const sortedLabs = Object.entries(labCounts).sort((a, b) => b[1] - a[1]);

        console.log('\n🏆 Top 10 Laboratories:');
        sortedLabs.slice(0, 10).forEach(([lab, count]) => {
            console.log(`   - ${lab}: ${count}`);
        });
    }
}

analyzeLabs();
