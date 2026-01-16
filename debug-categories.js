const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('firecrawl_raw.html', 'utf8');
const $ = cheerio.load(html);

console.log("\n--- All Categories Found ---");
$('app-sidebar-left-filters-categories h5.title-filtres').each((i, el) => {
    const text = $(el).text().trim();
    if (text) console.log(text);
});
