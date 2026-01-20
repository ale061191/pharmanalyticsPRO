
const fs = require('fs');
const path = require('path');

const JSON_FILE = path.join(__dirname, 'data', 'pharmacy_catalog_final.json');

function verify() {
    console.log(`Reading ${JSON_FILE}...`);

    if (!fs.existsSync(JSON_FILE)) {
        console.error("File not found!");
        return;
    }

    const products = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`Total Products in JSON: ${products.length}`);

    // These are presumably "Active" or processed products.
    // Check categories.
    const counts = {};
    const medIds = [];

    products.forEach(p => {
        const c = p.category || 'Unknown';
        counts[c] = (counts[c] || 0) + 1;

        if (c === 'Medicamentos') {
            medIds.push(p.id);
        }
    });

    console.log('--- Active Products by Category (JSON) ---');
    console.log(JSON.stringify(counts, null, 2));

    console.log(`\n'Medicamentos' count: ${medIds.length}`);

    // Also checking pure filter from original script if needed
    // But 'category' check is cleaner.
}

verify();
