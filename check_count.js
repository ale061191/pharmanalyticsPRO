const fs = require('fs');
const cheerio = require('cheerio');

try {
    const html = fs.readFileSync('firecrawl_raw.html', 'utf-8');
    const $ = cheerio.load(html);

    // 1. Extracted Count
    const cards = $('app-product-card');
    console.log(`EXTRACTED_COUNT: ${cards.length}`);

    // 2. Web Total Count
    // Looking for patterns like "131 resultados", "Mostrando 1-20 de 131", etc.
    // Searching in the whole body text for "resultados"
    const bodyText = $('body').text();
    const resultMatch = bodyText.match(/(\d+)\s+resultados/i) || bodyText.match(/de\s+(\d+)\s+productos/i);

    if (resultMatch) {
        console.log(`WEB_TOTAL_COUNT: ${resultMatch[1]}`);
    } else {
        console.log("WEB_TOTAL_COUNT: Not Found");
    }

} catch (e) {
    console.error(e);
}
