
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjE0MDcsImV4cCI6MjA4MzgzNzQwN30.ccIewEgM8geAq09BYq5Zg7TVNROJRixzpB8Wo5GcNuE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function countHistory() {
    const { count, error } = await supabase
        .from('stock_history')
        .select('*', { count: 'exact', head: true });

    console.log('Stock History Rows:', count);
    if (error) console.error(error);
}
countHistory();
