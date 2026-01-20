
const fs = require('fs');
const path = require('path');

const ALGOLIA_FILE = path.join(__dirname, 'data', 'algolia_products.json');
const STOCK_FILE = path.join(__dirname, 'data', 'detailed_stock.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'pharmacy_catalog_full.json');

function main() {
    console.log("Merging data...");

    if (!fs.existsSync(ALGOLIA_FILE) || !fs.existsSync(STOCK_FILE)) {
        console.error("Missing source files.");
        return;
    }

    const algoliaProducts = JSON.parse(fs.readFileSync(ALGOLIA_FILE, 'utf8'));
    const stockData = JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));

    // Index stock data by ID for fast lookup
    const stockMap = new Map();
    stockData.forEach(item => {
        stockMap.set(item.id, item.stock_details);
    });

    console.log(`Algolia Items: ${algoliaProducts.length}`);
    console.log(`Enriched Stock Items: ${stockData.length}`);

    const fused = algoliaProducts.map(p => {
        const details = stockMap.get(p.id);

        let cityAvailability = {};
        if (details) {
            cityAvailability = details;
        }

        // Calculate total units if interested?
        let totalUnits = 0;
        if (details) {
            Object.values(details).forEach(stores => {
                stores.forEach(s => totalUnits += (s.stock || 0));
            });
        }

        return {
            ...p,
            stock_granular: cityAvailability,
            total_units_in_target_cities: totalUnits
        };
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fused, null, 2));
    console.log(`Saved merged catalog to ${OUTPUT_FILE}`);
}

main();
