const { createClient } = require('@supabase/supabase-js');

// Mock environment variables for manual run
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // I'll assume I need to set this when running, or use ANON if RLS is open

if (!SUPABASE_KEY) {
    console.error("Please set SUPABASE_SERVICE_ROLE_KEY env var");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCompetitors(targetId) {
    console.log(`Checking competitors for product ID: ${targetId}`);

    // 1. Get Product
    const { data: product, error } = await supabase
        .from('products')
        .select('id, name, atc_code, is_pharma, clean_name')
        .eq('id', targetId)
        .single();

    if (error) {
        console.error("Error fetching product:", error);
        return;
    }
    console.log("Target product:", product);

    if (!product.atc_code) {
        console.log("No ATC Code.");
        return;
    }

    const atcPrefix = product.atc_code.substring(0, 3);
    console.log("Searching for ATC Prefix:", atcPrefix);

    // 2. Query Competitors (mimicking route.ts)
    const { data: competitors, error: compError } = await supabase
        .from('products')
        .select('id, name, clean_name, brand, atc_code, is_pharma')
        .ilike('atc_code', `${atcPrefix}%`)
        .eq('is_pharma', true) // The fix I added
        .limit(20);

    if (compError) {
        console.error("Error fetching competitors:", compError);
    } else {
        console.log(`Found ${competitors.length} competitors (with is_pharma=true). First 5:`);
        competitors.slice(0, 5).forEach(c => {
            console.log(`- ${c.clean_name || c.name} (is_pharma: ${c.is_pharma})`);
        });
    }

    // 3. Query "Dirty" ones that match ATC but NOT is_pharma
    const { data: dirty, error: dirtyError } = await supabase
        .from('products')
        .select('id, name, clean_name, brand, atc_code, is_pharma')
        .ilike('atc_code', `${atcPrefix}%`)
        .not('is_pharma', 'eq', true)
        .limit(5);

    console.log("\nDirty items (matching ATC but NOT is_pharma):");
    if (dirty) {
        dirty.forEach(d => console.log(`- ${d.name} (is_pharma: ${d.is_pharma})`));
    }

}

// Run with a sample ID if known, or just search for one
async function run() {
    // Let's find a product in M01 (Antiinflammatory) which seems to be the user's category (Diclofenac)
    const { data } = await supabase.from('products').select('id, name, atc_code').ilike('name', '%diclofenac%').limit(1).single();
    if (data) await checkCompetitors(data.id);
}

run();
