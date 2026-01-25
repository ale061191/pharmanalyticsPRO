const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function countATC() {
    // Count all
    const { count: total, error } = await supabase
        .from('atc_reference')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting:', error);
        return;
    }

    console.log(`Total ATC Codes in DB: ${total}`);

    // Fetch all codes to analyze locally (faster than complex SQL group by for this size)
    const { data: codes, error: err2 } = await supabase
        .from('atc_reference')
        .select('atc_code, atc_name')
        .limit(10000); // Override default 1000 limit

    if (err2) {
        console.error('Error fetching codes:', err2);
        return;
    }

    if (!codes) return;

    // Groups Level 1 (1 letter)
    const level1 = new Set(codes.map(c => c.atc_code.charAt(0)));
    console.log(`Level 1 (Anatomical Groups): ${level1.size} -> ${[...level1].join(', ')}`);

    // Groups Level 2 (3 chars - Letter + 2 digits)
    // Actually ATC structure:
    // L1: A (Alimentary)
    // L2: A10 (Drugs used in diabetes)
    // L3: A10B (Oral blood glucose lowering drugs)
    // L4: A10BA (Biguanides)
    // L5: A10BA02 (Metformin)

    // We'll count unique prefixes of length 3 (L2)
    const level2 = new Set(codes.map(c => c.atc_code.substring(0, 3)).filter(c => c.length === 3));
    console.log(`Level 2 (Therapeutic Groups): ${level2.size}`);

    // Level 3 (4 chars)
    const level3 = new Set(codes.map(c => c.atc_code.substring(0, 4)).filter(c => c.length === 4));
    console.log(`Level 3 (Pharmacological Subgroups): ${level3.size}`);

    console.log('--- Sample Level 2 Groups ---');
    console.log([...level2].slice(0, 5));
}

countATC();
