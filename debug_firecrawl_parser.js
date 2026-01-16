
const fs = require('fs');
const path = require('path');

function parseProductsFromMarkdown(markdown) {
    const products = [];
    const lines = markdown.split('\n').map(l => l.trim()).filter(l => l);

    console.log(`Processing ${lines.length} non-empty lines.`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Relaxed regex: matches **Bs. if present anywhere, but prioritizes start
        const priceMatch = line.match(/\*\*Bs\.([\d\.]+,\d{2}|[\d\.]+\.\d{2})\*\*/);

        if (priceMatch) {
            const currentPriceStr = priceMatch[1];

            // ... (Price parsing logic same as before)
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

            // Name logic
            let offset = 1;
            let skipped = [];
            while (i - offset >= 0) {
                const prev = lines[i - offset];
                if (prev.includes('%') || prev.includes('mins') || prev.includes('Dcto') || prev.includes('Bs') || prev === '¡Aprovecha!' || prev.startsWith('Solo DELIVERY')) {
                    skipped.push(prev);
                    offset++;
                    continue;
                }
                break;
            }

            const name = lines[i - offset];

            // Lab logic
            let labOffset = offset + 1;
            while (i - labOffset >= 0) {
                const prev = lines[i - labOffset];
                if (prev.includes('%') || prev.includes('mins') || prev === '¡Aprovecha!' || prev === 'Solo DELIVERY - 15% Dcto. 1era Compra') {
                    labOffset++;
                    continue;
                }
                break;
            }
            const lab = lines[i - labOffset];

            if (name && name.length > 3 && !name.startsWith('**') && !name.startsWith('Bs')) {
                products.push({
                    name: name,
                    lab_name: lab || 'Desconocido',
                    price: priceVal,
                    lineLine: i
                });
            } else {
                console.log(`[REJECTED] Line ${i}: Price matched (${priceVal}) but name invalid: "${name}". Skipped: ${JSON.stringify(skipped)}`);
            }
        }
    }
    return products;
}

const filePath = path.join(__dirname, 'firecrawl_raw.md');
const md = fs.readFileSync(filePath, 'utf-8');
const products = parseProductsFromMarkdown(md);
console.log(`\nFound ${products.length} products.`);
if (products.length > 0) {
    console.log("Sample:", products.slice(0, 5));
}
