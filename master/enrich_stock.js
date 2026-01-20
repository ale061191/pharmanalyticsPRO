
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
require('dotenv').config({ path: '.env.local' });
const INPUT_FILE = path.join(__dirname, 'data', 'algolia_products.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'detailed_stock.json');

// Captured from Browser (Static Token)
const TOKEN = process.env.FARM_TOKEN;
const TOKEN_ID_WEBSAFE = process.env.FARM_TOKEN_ID;
const KEY = process.env.FARM_KEY;

const HEADERS_API = {
    'DEVICE-ID': process.env.FARM_DEVICE_ID || '33d3f30e-cc88-eb7c-3af7-a18b54e1b145',
    'country': 'VEN',
    'source': 'WEB',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.farmatodo.com.ve',
    'Referer': 'https://www.farmatodo.com.ve/'
};

const TARGET_CITIES = {
    "Caracas": [128, 157, 140, 136, 100, 124, 130, 153, 105, 104, 156, 118, 138, 139, 116, 134, 193, 167, 101, 165, 160, 155, 195, 141, 107, 168, 166, 152, 164, 102, 126, 191, 142, 108, 121, 147, 158, 119, 149, 115, 181, 117, 150, 154, 148, 194, 109, 196, 129, 189, 182, 132, 159, 110, 135, 137, 120, 145, 192, 111, 114, 125, 146, 112, 113, 143, 131, 188, 144, 133],
    "Anaco": [426, 420],
    "Valencia": [281, 209, 273, 289, 282, 287, 275, 286, 288, 278, 283, 279, 284]
};

// Flatten to Set for fast lookup
const ALL_TARGET_STORE_IDS = new Set(Object.values(TARGET_CITIES).flat());

async function fetchStockForProduct(id) {
    const baseUrl = `https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2`;
    const params = {
        idItem: id,
        token: TOKEN,
        tokenIdWebSafe: TOKEN_ID_WEBSAFE,
        key: KEY
    };

    try {
        const response = await axios.get(baseUrl, { params, headers: HEADERS_API });
        return response.data; // The raw big JSON
    } catch (error) {
        // Return null on error so we can retry or skip
        console.error(`Error fetching ${id}: ${error.message}`);
        return null;
    }
}

function processStockResponse(data) {
    if (!data || !data.otherCities) return {};

    let result = {};

    // Create skeleton
    for (const city of Object.keys(TARGET_CITIES)) {
        result[city] = []; // detailed stores
    }

    // Traverse
    for (const cityData of data.otherCities) {
        // Check if this city name matches one of ours?
        // Actually name might differ "CARACAS" vs "Caracas".
        // Better: Iterate ALL stores in the response and check ID.
        if (cityData.stores) {
            for (const store of cityData.stores) {
                const storeId = parseInt(store.id); // Ensure int

                // Check which target city this store belongs to
                for (const [targetCity, validIds] of Object.entries(TARGET_CITIES)) {
                    if (validIds.includes(storeId)) {
                        result[targetCity].push({
                            stock: store.stock, // Units
                            name: store.name,
                            address: store.address,
                            municipality: cityData.name // e.g. "LIBERTADOR (DC)"
                        });
                        break; // Found the city for this store
                    }
                }
            }
        }
    }
    return result;
}

// Concurrency Control
async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error("Input file not found:", INPUT_FILE);
        return;
    }

    const products = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`Loaded ${products.length} products to scan.`);

    // For verification in Agent session, limit to 50 items.
    // User can remove .slice(0, 50) for full run.
    const productsToScan = products.filter(p => {
        if (!p.stock_stores_ids || p.stock_stores_ids.length === 0) return false;
        return p.stock_stores_ids.some(id => ALL_TARGET_STORE_IDS.has(id));
    });

    console.log(`Filtered down to ${productsToScan.length} products relevant to target cities.`);

    let results = [];
    const concurrency = 5;

    // Helper for simple queue
    async function worker(items) {
        for (const item of items) {
            // console.log(`Scanning ${item.id} - ${item.name}...`);
            const rawData = await fetchStockForProduct(item.id);
            if (rawData) {
                const stockDetails = processStockResponse(rawData);

                // Only keep if we actually found stock in our cities?
                // Yes, but keeping "0" is also valid info if needed.
                // We'll attach it.
                item.stock_details = stockDetails;
                results.push(item);
            } else {
                // Keep item but mark as error? Or skip?
                // Skip for now to keep clean data
            }
            // Small delay to be nice
            await new Promise(r => setTimeout(r, 50));
        }
    }

    // Split items into chunks for workers
    const chunkSize = Math.ceil(productsToScan.length / concurrency);
    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        const chunk = productsToScan.slice(i * chunkSize, (i + 1) * chunkSize);
        workers.push(worker(chunk));
    }

    console.log(`Starting ${concurrency} workers...`);
    await Promise.all(workers);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`Done! Saved ${results.length} enriched records to ${OUTPUT_FILE}`);
}

main();
