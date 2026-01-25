const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function diagnose() {
    console.log('🔍 Diagnosing Metadata Issues...');

    // Fetch problematic products observed by the user
    // "Brugesic" and "Hioscina"
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .or('clean_name.ilike.%Brugesic%,clean_name.ilike.%Hioscina%')
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No products found matching diagnosis criteria.');
    } else {
        let report = '';
        data.forEach(p => {
            report += '------------------------------------------------\n';
            report += `Original Name: "${p.name}"\n`;
            report += `Clean Name:    "${p.clean_name}"\n`;
            report += `Presentation:  "${p.presentation}"\n`;
            report += `Concentration: "${p.concentration}"\n`;
            report += `Active Ing:    "${p.active_ingredient}"\n`;

            // Heuristic analysis
            if (!p.presentation && p.name.toLowerCase().includes('tab')) report += '⚠️ MISSING PRESENTATION (Source likely has "tab")\n';
            if (!p.concentration && p.name.includes('mg')) report += '⚠️ MISSING CONCENTRATION (Source likely has "mg")\n';
            if (!p.concentration && /[0-9]+\s*(mg|g|ml)/i.test(p.name)) report += '⚠️ MISSING CONCENTRATION (Regex detect potential match)\n';
        });
        fs.writeFileSync('diagnosis_output.txt', report);
        console.log('Report written to diagnosis_output.txt');
    }
}

diagnose();
