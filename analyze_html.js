const fs = require('fs');

const html = fs.readFileSync('farmatodo_dump.html', 'utf8');

function search(term) {
    let index = 0;
    while ((index = html.indexOf(term, index)) !== -1) {
        const start = Math.max(0, index - 200);
        const end = Math.min(html.length, index + 200);
        console.log(`\nMatch for "${term}" at ${index}:`);
        console.log(html.substring(start, end));
        index += term.length;
    }
}

console.log("Searching for 'TEPUY'...");
search('TEPUY');

console.log("\nSearching for 'tiendas'...");
search('tiendas');
