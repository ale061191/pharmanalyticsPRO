const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function analyze() {
    console.log('Fetching all ATC codes...');
    const { data: all, error } = await supabase
        .from('atc_reference')
        .select('atc_code, atc_name')
        .limit(10000);

    if (error) {
        console.error(error);
        return;
    }

    // 1. Map Headers (Level 2 -> Name)
    // Structure: A10 (3 chars) is the group header
    const groupNames = {};
    const groupCounts = {};

    // Initial pass to find names and init counts
    all.forEach(row => {
        if (row.atc_code.length === 3) {
            groupNames[row.atc_code] = row.atc_name;
            groupCounts[row.atc_code] = 0;
        }
    });

    // Second pass to count children
    all.forEach(row => {
        // We typically care about Level 5 (7 chars) or at least deeper levels
        // If we just count EVERYTHING starting with A10, we count A10, A10B, A10BA, A10BA02. 
        // User likely wants "how many drugs" (Level 5).
        // Let's count Level 5 (7 chars) as "Substances".
        if (row.atc_code.length === 7) {
            const prefix = row.atc_code.substring(0, 3);
            if (groupCounts[prefix] !== undefined) {
                groupCounts[prefix]++;
            } else {
                // In case we missed the header (sometimes header is missing but children exist)
                // We'll init it, but we won't have a name yet.
                if (!groupCounts[prefix]) groupCounts[prefix] = 0;
                groupCounts[prefix]++;
            }
        }
    });

    // Prepare list
    const results = Object.keys(groupCounts).map(code => ({
        code,
        name: groupNames[code] || '(Sin Título)',
        count: groupCounts[code]
    }));

    // Sort by count DESC
    results.sort((a, b) => b.count - a.count);

    const table = results.slice(0, 20).map(r =>
        `${r.code.padEnd(6)} | ${r.count.toString().padEnd(6)} | ${r.name}`
    ).join('\n');

    const report =
        `Found ${results.length} Therapeutic Groups (Level 2).\n` +
        `Total Substances (Level 5): ${results.reduce((a, b) => a + b.count, 0)}\n\n` +
        `Top 20 Groups:\n${table}`;

    require('fs').writeFileSync('atc_report.txt', report);
    console.log('Report written to atc_report.txt');
}

analyze();
