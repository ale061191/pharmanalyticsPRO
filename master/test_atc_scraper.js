const axios = require('axios');
const cheerio = require('cheerio');

const TEST_INGREDIENTS = [
    'Ibuprofen',
    'Atorvastatin',
    'Acetaminophen', // Should map to Paracetamol usually, checking WHO handling
    'Losartan',
    'Metformin'
];

async function checkWhoAtc(ingredient) {
    console.log(`\n🔍 Searching WHO for: ${ingredient}...`);
    try {
        const url = `https://atcddd.fhi.no/atc_ddd_index/?code=&name=${encodeURIComponent(ingredient)}`;
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // WHO results table selector
        const rows = $('table tr');
        let found = false;

        rows.each((i, el) => {
            if (i === 0) return; // Header
            const cols = $(el).find('td');
            if (cols.length > 0) {
                const atcCode = $(cols[0]).text().trim();
                const name = $(cols[1]).text().trim();

                if (name.toLowerCase().includes(ingredient.toLowerCase())) {
                    console.log(`   ✅ Match: ${atcCode} - ${name}`);
                    found = true;
                }
            }
        });

        if (!found) console.log('   ❌ No direct match found.');

    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
    }
}

async function main() {
    console.log('🧪 Testing WHO ATC Scraper Connectivity\n');
    for (const ing of TEST_INGREDIENTS) {
        await checkWhoAtc(ing);
        await new Promise(r => setTimeout(r, 1000)); // Politeness delay
    }
}

main();
