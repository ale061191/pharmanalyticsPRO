const axios = require('axios');
const cheerio = require('cheerio');

async function checkMediately(query) {
    console.log(`\n🔍 Searching Mediately for: ${query}...`);
    try {
        // Mediately search URL for Venezuela or generic Spanish?
        // User gave generic home. Let's try searching.
        // Usually scraping search results.
        const url = `https://mediately.co/es/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);

        // Look for results
        // Selectors are guessing games without visiting, but standard verification strategy:
        // Look for links to drugs.
        const firstResult = $('.search-results .result-item a, .results-list a').first();

        if (firstResult.length) {
            const link = firstResult.attr('href');
            const title = firstResult.text().trim();
            console.log(`   🔗 Found Drug Link: ${title} (${link})`);

            // Visit product page
            if (link) {
                const productUrl = link.startsWith('http') ? link : `https://mediately.co${link}`;
                const { data: prodData } = await axios.get(productUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const $$ = cheerio.load(prodData);

                // Find ATC Code on page
                // Usually in a table or specific class. 
                // Let's dump all text that looks like ATC (LNNLLNN)
                const pageText = $$('body').text();
                const atcMatch = pageText.match(/[A-Z]\d{2}[A-Z]{2}\d{2}/);

                if (atcMatch) {
                    console.log(`   ✅ ATC Found: ${atcMatch[0]}`);
                } else {
                    console.log(`   ⚠️ No ATC pattern found on page.`);
                }
            }
        } else {
            console.log('   ❌ No search results found.');
        }

    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
    }
}

async function main() {
    await checkMediately('Diovan');
    await checkMediately('Zaldiar');
}

main();
