require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const cheerio = require('cheerio');

const apiKey = process.env.FIRECRAWL_API_KEY;

async function debugDeepScrape() {
    const url = "https://www.farmatodo.com.ve/producto/acetaminofen-dolipral-forte-650-mg-x-10-tabletas";
    console.log(`\n🚀 Debugging Deep Scrape for: ${url}`);

    try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                url: url,
                formats: ['html'],
                timeout: 60000 // 1 minute
            })
        });

        if (!response.ok) {
            throw new Error(`Firecrawl API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const html = data.data.html;

        console.log("✅ HTML Fetched. Size:", html.length);
        const $ = cheerio.load(html);

        // Check user provided selectors
        console.log("\n--- Checking Selectors ---");

        console.log("1. Product Title (h1.product-title):");
        const title = $('h1.product-title').text().trim();
        console.log(title ? `   ✅ Found: "${title}"` : "   ❌ Not Found");

        console.log("2. Stock District (.text-stock-district):");
        const stockEls = $('.text-stock-district');
        console.log(`   Found ${stockEls.length} elements.`);
        stockEls.each((i, el) => console.log(`   - [${i}] text: "${$(el).text().trim()}"`));

        console.log("3. District Name (.text-district strong):");
        const distEls = $('.text-district strong');
        console.log(`   Found ${distEls.length} elements.`);
        distEls.each((i, el) => console.log(`   - [${i}] text: "${$(el).text().trim()}"`));

        console.log("4. Stock Petal (.stock-petal):");
        const petalEls = $('.stock-petal');
        console.log(`   Found ${petalEls.length} elements.`);

        // Dump a snippet of HTML around these classes if found, or just body sample
        if (stockEls.length === 0) {
            console.log("\n--- HTML Snippet (Body Start) ---");
            console.log($('body').html().substring(0, 1000));
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

debugDeepScrape();
