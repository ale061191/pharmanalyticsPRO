
const fs = require('fs');
const path = require('path');

function parseProductsFromMarkdown(markdown) {
    const products = [];
    const lines = markdown.split('\n').map(l => l.trim()).filter(l => l);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Regex from the robust script
        const priceMatch = line.match(/\*\*Bs\.([\d\.]+,\d{2}|[\d\.]+\.\d{2})\*\*/);

        if (priceMatch) {
            const currentPriceStr = priceMatch[1];
            let rawNum = currentPriceStr.replace('Bs.', '').trim();
            let priceVal = 0;
            if (rawNum.includes(',')) {
                priceVal = parseFloat(rawNum.replace(/\./g, '').replace(',', '.'));
            } else {
                const parts = rawNum.split('.');
                if (parts.length > 1) {
                    const decimal = parts.pop();
                    const integer = parts.join('');
                    priceVal = parseFloat(`${integer}.${decimal}`);
                } else {
                    priceVal = parseFloat(rawNum);
                }
            }

            let offset = 1;
            while (i - offset >= 0) {
                const prev = lines[i - offset];
                if (prev.includes('%') || prev.includes('mins') || prev.includes('Dcto') || prev.includes('Bs') || prev === '¡Aprovecha!' || prev.startsWith('Solo DELIVERY')) {
                    offset++;
                    continue;
                }
                break;
            }
            const name = lines[i - offset];

            if (name && name.length > 3 && !name.startsWith('**') && !name.startsWith('Bs')) {
                products.push({ name, price: priceVal, lineLine: i });
            }
        }
    }
    return products;
}

const filePath = path.join(__dirname, 'firecrawl_raw.md');
const md = fs.readFileSync(filePath, 'utf-8');
const products = parseProductsFromMarkdown(md);

const nameGroups = {};
products.forEach(p => {
    if (!nameGroups[p.name]) nameGroups[p.name] = [];
    nameGroups[p.name].push(p.price);
});

console.log(`Total detected items: ${products.length}`);
console.log(`Unique Names: ${Object.keys(nameGroups).length}`);

let collisionCount = 0;
let safeDuplicateCount = 0;

Object.keys(nameGroups).forEach(name => {
    const prices = nameGroups[name];
    if (prices.length > 1) {
        // Check if all prices are the same
        const uniquePrices = [...new Set(prices)];
        if (uniquePrices.length > 1) {
            console.log(`⚠️ POTENTIAL COLLISION: "${name}" has multiple different prices: ${uniquePrices.join(', ')}`);
            const instances = products.filter(p => p.name === name);
            console.log(`   -> Occurrences at markdown lines: ${instances.map(p => `Line around ${p.lineLine || '?'}`).join(', ')}`);
            collisionCount++;
        } else {
            // Safe duplicate (scroll artifact)
            safeDuplicateCount += (prices.length - 1);
        }
    }
});

console.log(`\nAnalysis Results:`);
console.log(`- Exact Scroll Copies (Safe): ${safeDuplicateCount}`);
console.log(`- Name Collisions (Different Prices - DANGER): ${collisionCount}`);
