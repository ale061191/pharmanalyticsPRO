
const fs = require('fs');
const path = require('path');

// 1. Data from your browser subagent session
const CITY_STORES = {
    "Caracas": [128, 157, 140, 136, 100, 124, 130, 153, 105, 104, 156, 118, 138, 139, 116, 134, 193, 167, 101, 165, 160, 155, 195, 141, 107, 168, 166, 152, 164, 102, 126, 191, 142, 108, 121, 147, 158, 119, 149, 115, 181, 117, 150, 154, 148, 194, 109, 196, 129, 189, 182, 132, 159, 110, 135, 137, 120, 145, 192, 111, 114, 125, 146, 112, 113, 143, 131, 188, 144, 133],
    "Anaco": [426, 420],
    "Valencia": [281, 209, 273, 289, 282, 287, 275, 286, 288, 278, 283, 279, 284]
};

// 2. Read Product Stock Data
const productStoresPath = path.join(__dirname, 'product_stores.json');
let productStores = [];
try {
    productStores = JSON.parse(fs.readFileSync(productStoresPath, 'utf8'));
    console.log(`\nProduct Available in Total: ${productStores.length} stores nationally.`);
} catch (e) {
    console.error("Error reading product_stores.json", e);
    process.exit(1);
}

// 3. Intersect
console.log("\n--- STOCK REPORT BY CITY ---");
for (const [city, cityStoreIds] of Object.entries(CITY_STORES)) {
    // Intersect: Filter city stores that are IN the product's stock list
    const availableStores = cityStoreIds.filter(id => productStores.includes(id));

    const count = availableStores.length;
    const total = cityStoreIds.length;
    const percentage = Math.round((count / total) * 100);

    console.log(`\n${city}:`);
    console.log(`   Availability: ${count} / ${total} stores (${percentage}%)`);
    if (count > 0) {
        console.log(`   Store IDs with Stock: [${availableStores.join(', ')}]`);
    } else {
        console.log(`   Stock: NONE`);
    }
}
