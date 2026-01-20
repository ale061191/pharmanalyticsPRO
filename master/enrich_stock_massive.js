
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const INPUT_FILE = path.join(__dirname, 'data', 'algolia_products.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'pharmacy_catalog_final.json');
const PROGRESS_FILE = path.join(__dirname, 'data', 'enrichment_progress.json');

// API Configuration
require('dotenv').config({ path: '.env.local' });

const TOKEN = process.env.FARM_TOKEN;
const TOKEN_ID_WEBSAFE = process.env.FARM_TOKEN_ID;
const KEY = process.env.FARM_KEY;
const HEADERS_API = {
    'DEVICE-ID': process.env.FARM_DEVICE_ID || '33d3f30e-cc88-eb7c-3af7-a18b54e1b145',
    'country': 'VEN',
    'source': 'WEB',
    'User-Agent': 'Mozilla/5.0',
    'Origin': 'https://www.farmatodo.com.ve',
    'Referer': 'https://www.farmatodo.com.ve/'
};

if (!TOKEN || !TOKEN_ID_WEBSAFE || !KEY) {
    console.error("ERROR: Missing Farmatodo API Credentials in .env.local");
    process.exit(1);
}

// Utils: Delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchStock(id) {
    try {
        const url = `https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2?idItem=${id}&token=${TOKEN}&tokenIdWebSafe=${TOKEN_ID_WEBSAFE}&key=${KEY}`;
        const res = await axios.get(url, { headers: HEADERS_API, timeout: 30000 }); // 30s timeout
        return res.data;
    } catch (e) {
        if (e.response && e.response.status === 404) return { items: [] }; // No stock info
        console.error(`Error fetching ${id}: ${e.message}`, e.response ? e.response.data : '');
        return null; // Retry candidate
    }
}

async function main() {
    console.log("Starting MASSIVE STOCK ENRICHMENT (Stealth Mode: ON)...");

    // 1. Load Data
    const products = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`Loaded ${products.length} products from Algolia.`);

    // 2. Filter & Init
    // Only process items that Algolia said "have stock" in at least one store to save calls
    // OR should we process all? Algolia 'stores_with_stock' is pretty reliable.
    // Let's filter to be efficient.
    const candidates = products.filter(p => p.stock_stores_ids && p.stock_stores_ids.length > 0);
    console.log(`Products with potential stock: ${candidates.length}`);

    let results = [];
    let processedCount = 0;

    // Load progress if exists
    if (fs.existsSync(PROGRESS_FILE)) {
        results = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        processedCount = results.length;
        console.log(`Resuming from ${processedCount} processed items.`);
    }

    // Map existing results to IDs to skip
    const processedIds = new Set(results.map(r => r.id));
    const toProcess = candidates.filter(p => !processedIds.has(p.id));

    console.log(`Items remaining to fetch: ${toProcess.length}`);

    // Batch Processing
    const BATCH_SIZE = 3; // Reduced from 5 to 3
    const DELAY_BETWEEN_BATCHES_MS = 600; // Slight increase

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
        const batch = toProcess.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (p) => {
            const stockData = await fetchStock(p.id);

            // Transform & Strip Prices
            const stock_granular = [];
            let total_units = 0;

            if (stockData && stockData.items) {
                stockData.items.forEach(cityItem => {
                    if (cityItem.municipalityList) {
                        cityItem.municipalityList.forEach(muni => {
                            if (muni.storeGroupList) {
                                muni.storeGroupList.forEach(sg => {
                                    if (sg.stock > 0 && sg.storeList && sg.storeList.length > 0) {
                                        const store = sg.storeList[0];
                                        stock_granular.push({
                                            city: cityItem.name,
                                            municipality: muni.name,
                                            store_name: store.name,
                                            store_id: store.id,
                                            address: store.address,
                                            units: sg.stock,
                                            lat: store.latitude,
                                            lng: store.longitude
                                        });
                                        total_units += sg.stock;
                                    }
                                });
                            }
                        });
                    }
                });
            }

            return {
                id: p.id,
                name: p.name, // Keep Name
                brand: p.brand, // Keep Brand
                category: p.category, // Keep Category
                subcategory: p.subcategory,
                department: p.department,
                image: p.image,
                // PRICE STRATEGY:
                // 1. Strip "Selling Price" (price, offerPrice) to avoid "Time Travel" bias.
                // 2. Keep "Original Price" (price_full) ONLY as a static reference for value context.
                original_price: p.price_full || 0,
                stock_granular: stock_granular,
                total_units: total_units,
                last_updated: new Date().toISOString()
            };
        });

        const batchResults = await Promise.all(promises);

        // Filter out nulls (failed fetches) - optionally we could retry them later
        const validBatch = batchResults.filter(r => r !== null);
        results.push(...validBatch);

        // Save Progress every 10 batches
        if ((i / BATCH_SIZE) % 10 === 0) {
            fs.writeFileSync(PROGRESS_FILE, JSON.stringify(results, null, 2));
            process.stdout.write(`.`); // Progress indicator
        }

        await sleep(DELAY_BETWEEN_BATCHES_MS);
    }

    console.log("\nEnrichment Complete.");

    // Final Save
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    // Cleanup progress
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);

    console.log(`Saved ${results.length} enriched records to ${OUTPUT_FILE}`);
}

main();
