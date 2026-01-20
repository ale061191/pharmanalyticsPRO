
const fs = require('fs');
const path = require('path');

const ALGOLIA_FILE = path.join(__dirname, 'master', 'data', 'algolia_products.json');

const products = JSON.parse(fs.readFileSync(ALGOLIA_FILE, 'utf8'));

const storeIds = new Set();

products.forEach(p => {
    if (p.stock_stores_ids && Array.isArray(p.stock_stores_ids)) {
        p.stock_stores_ids.forEach(id => storeIds.add(String(id))); // Ensure string for consistency
    }
});

console.log(`Total Unique Store IDs in Algolia Metadata: ${storeIds.size}`);
console.log(`First 10 IDs:`, Array.from(storeIds).slice(0, 10));
