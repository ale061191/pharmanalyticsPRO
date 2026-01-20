
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const algoliasearch = require('algoliasearch');

const ALGOLIA_FILE = path.join(__dirname, 'data', 'algolia_products.json');

// API Config
const TOKEN = '65e50762cac1a844df5f2d9108065d78';
const TOKEN_ID_WEBSAFE = 'ahZzfm9yYWNsZS1zZXJ2aWNlcy12emxhcl0LEgRVc2VyIiRkZDBiZGU0NS1iOGUxLTQ0ZjAtODU0Yi0xYTJjNDExMWY5MTgMCxIFVG9rZW4iJGExMWY0MWM5LWVmZDUtNGI1Zi1hYmVhLWY5NTBjM2VlZWEyYQw';
const KEY = 'AIzaSyAidR6Tt0K60gACR78aWThMQb7L5u6Wpag';
const HEADERS_API = {
    'DEVICE-ID': '33d3f30e-cc88-eb7c-3af7-a18b54e1b145',
    'country': 'VEN',
    'source': 'WEB',
    'User-Agent': 'Mozilla/5.0',
    'Origin': 'https://www.farmatodo.com.ve',
    'Referer': 'https://www.farmatodo.com.ve/'
};

// Algolia Client
const client = algoliasearch('VCOJEYD2PO', '869a91e98550dd668b8b1dc04bca9011');
const index = client.initIndex('products-venezuela');

const TARGET_CITIES_MAP = {
    "Caracas": [128, 157, 140, 136, 100, 124, 130, 153, 105, 104, 156, 118, 138, 139, 116, 134, 193, 167, 101, 165, 160, 155, 195, 141, 107, 168, 166, 152, 164, 102, 126, 191, 142, 108, 121, 147, 158, 119, 149, 115, 181, 117, 150, 154, 148, 194, 109, 196, 129, 189, 182, 132, 159, 110, 135, 137, 120, 145, 192, 111, 114, 125, 146, 112, 113, 143, 131, 188, 144, 133],
    "Anaco": [426, 420],
    "Valencia": [281, 209, 273, 289, 282, 287, 275, 286, 288, 278, 283, 279, 284]
};
const ALL_TARGET_IDS = new Set(Object.values(TARGET_CITIES_MAP).flat());

async function fetchStock(id) {
    try {
        const url = `https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2?idItem=${id}&token=${TOKEN}&tokenIdWebSafe=${TOKEN_ID_WEBSAFE}&key=${KEY}`;
        const res = await axios.get(url, { headers: HEADERS_API });
        // The API returns structure: { items: [ { name: "Caracas", municipalityList: ... } ] }
        return res.data;
    } catch (e) {
        console.error("API Error: " + e.message);
        return null;
    }
}

async function main() {
    console.log("Reading catalog...");
    const products = JSON.parse(fs.readFileSync(ALGOLIA_FILE, 'utf8'));

    // Group by Category
    const categories = {};
    products.forEach(p => {
        if (!p.category) return;
        if (!categories[p.category]) categories[p.category] = [];
        // Only keep if it has stock in TARGET cities candidates
        if (p.stock_stores_ids && p.stock_stores_ids.some(id => ALL_TARGET_IDS.has(id))) {
            categories[p.category].push(p);
        }
    });

    const selectedKeys = Object.keys(categories).slice(0, 10);
    console.log(`Selecting samples from ${selectedKeys.length} categories...`);

    const samples = [];
    const sampleIds = [];

    for (const cat of selectedKeys) {
        if (categories[cat].length === 0) continue;
        const product = categories[cat][0];
        samples.push({ product, cat });
        sampleIds.push(product.id);
    }

    console.log("Fetching correct names from Algolia...");
    let algoliaObjects = [];
    try {
        const algoliaRes = await index.getObjects(sampleIds, {
            attributesToRetrieve: ['mediaDescription', 'brand', 'fullPrice']
        });
        algoliaObjects = algoliaRes.results;
    } catch (err) {
        console.error("Algolia fetch error:", err.message);
    }

    const results = [];

    for (let i = 0; i < samples.length; i++) {
        const { product, cat } = samples[i];
        const algoliaData = algoliaObjects[i] || {};
        const correctName = (algoliaData && algoliaData.mediaDescription) ? algoliaData.mediaDescription : "Unknown Product Name";

        // Fetch Live Stock
        const stockData = await fetchStock(product.id);

        let foundStock = null;

        // Traverse correct JSON structure
        if (stockData && stockData.items) {
            for (const cityItem of stockData.items) {
                // Check if this city is one of our targets
                // API name might be "Caracas", "Valencia", "Anaco"
                // Normalize names: "Caracas" matches.
                if (["Caracas", "Valencia", "Anaco"].includes(cityItem.name)) {

                    if (cityItem.municipalityList) {
                        for (const muni of cityItem.municipalityList) {
                            if (muni.storeGroupList) {
                                for (const sg of muni.storeGroupList) {
                                    // Check stock in storeGroup (this correlates to available units)
                                    // Use storeList[0] to get address/name details
                                    if (sg.stock > 0 && sg.storeList && sg.storeList.length > 0) {
                                        const details = sg.storeList[0];
                                        foundStock = {
                                            city: cityItem.name,
                                            municipality: muni.name,
                                            store: details.name,
                                            units: sg.stock, // Use GROUP stock
                                            address: details.address
                                        };
                                        break;
                                    }
                                }
                            }
                            if (foundStock) break;
                        }
                    }
                }
                if (foundStock) break;
            }
        }

        results.push({
            category: cat,
            product: { ...product, name: correctName },
            stock_sample: foundStock || { city: "N/A", store: "Sin Stock en Target Cities", units: 0, address: "N/A" }
        });
    }

    // Generate Report String
    let report = "\n====== VERIFICATION SAMPLES ======\n\n";
    results.forEach((r, i) => {
        const p = r.product;
        const s = r.stock_sample;
        report += `${i + 1}. [${p.category}]\n`;
        report += `   Producto: ${p.name}\n`;
        report += `   ID: ${p.id}\n`;
        report += `   Marca: ${p.brand}\n`;

        try {
            const pReal = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(p.price_real);
            const pFull = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(p.price_full);
            report += `   Precio: ${pReal} (Full: ${pFull}) -> Descuento: ${p.discount_percent}%\n`;
        } catch (e) {
            report += `   Precio: ${p.price_real} (Full: ${p.price_full}) -> Descuento: ${p.discount_percent}%\n`;
        }

        report += `   Stock Real: ${s.city} (Mun. ${s.municipality}) -> Sucursal: ${s.store} -> DISPONIBLE: ${s.units} unidades\n`;
        report += `   Dirección: ${s.address}\n`;
        report += "------------------------------------------------\n";
    });

    fs.writeFileSync(path.join(__dirname, 'verification_report.txt'), report);
    console.log("Report saved.");
}

main();
