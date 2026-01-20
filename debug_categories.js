
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjE0MDcsImV4cCI6MjA4MzgzNzQwN30.ccIewEgM8geAq09BYq5Zg7TVNROJRixzpB8Wo5GcNuE';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
    console.log('Fetching distinct categories from products...');

    // Fetch all products and extract unique categories manually since distinct() isn't always direct in client
    const { data, error } = await supabase
        .from('products')
        .select('category');

    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }

    const uniqueCategories = [...new Set(data.map(p => p.category))].sort();

    console.log('--- DB Categories ---');
    uniqueCategories.forEach(c => console.log(`"${c}"`));
    console.log('---------------------');
}

checkCategories();
