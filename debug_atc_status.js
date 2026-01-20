
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjE0MDcsImV4cCI6MjA4MzgzNzQwN30.ccIewEgM8geAq09BYq5Zg7TVNROJRixzpB8Wo5GcNuE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkATC() {
    // Count total products
    const { count: total } = await supabase.from('products').select('*', { count: 'exact', head: true });

    // Count products with ATC
    const { count: withATC } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('atc_code', 'is', null);

    console.log(`Total Products: ${total}`);
    console.log(`With ATC Code: ${withATC}`);
    console.log(`Progress: ${((withATC / total) * 100).toFixed(2)}%`);
}
checkATC();
