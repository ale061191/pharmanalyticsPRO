const { createClient } = require('@supabase/supabase-js');

// Hardcoded keys from .env.local view (safe for local debugging script which will be deleted)
const SUPABASE_URL = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjE0MDcsImV4cCI6MjA4MzgzNzQwN30.ccIewEgM8geAq09BYq5Zg7TVNROJRixzpB8Wo5GcNuE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkMaturin() {
    console.log("🔍 Checking 'sucursales' for 'Maturin'...");

    // 1. Check exact match
    const { data: exact, error: exactError } = await supabase
        .from('sucursales')
        .select('*')
        .eq('city', 'Maturin'); // No accent

    if (exactError) console.error("Exact error:", exactError);
    console.log(`✅ Exact 'Maturin' Count: ${exact?.length || 0}`);
    if (exact?.length > 0) {
        console.log("Sample:", exact[0]);
    }

    // 2. Check accented match
    const { data: accented, error: accentedError } = await supabase
        .from('sucursales')
        .select('*')
        .eq('city', 'Maturín'); // With accent

    if (accentedError) console.error("Accented error:", accentedError);
    console.log(`✅ Accented 'Maturín' Count: ${accented?.length || 0}`);
    if (accented?.length > 0) {
        console.log("Sample:", accented[0]);
    }

    // 3. Check ILIKE
    const { data: like, error: likeError } = await supabase
        .from('sucursales')
        .select('*')
        .ilike('city', '%matur%');

    if (likeError) console.error("Like error:", likeError);
    console.log(`✅ ILIKE '%matur%' Count: ${like?.length || 0}`);

    // Check for null coords
    const nullCoords = like?.filter(s => !s.lat || !s.lng);
    console.log(`⚠️ Stores with NULL coordinates: ${nullCoords?.length || 0}`);
}

checkMaturin();
