
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'algolia_products.json');

try {
    const products = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Filter for "Losartán" and "Genven" to be sure
    const match = products.find(p =>
        p.name && p.name.includes('Losartán') && p.name.includes('Genven') && p.name.includes('50 mg')
    );

    if (match) {
        console.log("FOUND PRODUCT:");
        console.log(JSON.stringify(match, null, 2));
    } else {
        console.log("Product not found in local dump. Try checking a different one.");
        // Print first 1 items to see schema just in case
        console.log("Sample Schema:", JSON.stringify(products[0], null, 2));
    }

} catch (e) {
    console.error("Error:", e.message);
}
