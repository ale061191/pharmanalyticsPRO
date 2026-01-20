
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjE0MDcsImV4cCI6MjA4MzgzNzQwN30.ccIewEgM8geAq09BYq5Zg7TVNROJRixzpB8Wo5GcNuE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCategories() {
    const { data, error } = await supabase
        .from('products')
        .select('category');

    if (error) { console.error(error); return; }

    const counts = {};
    data.forEach(p => {
        const cat = p.category || 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
    });

    console.log('Product Distribution by Category:');
    console.table(counts);
}
analyzeCategories();
