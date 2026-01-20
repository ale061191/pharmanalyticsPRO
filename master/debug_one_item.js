
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const TARGET_ID = '114436398'; // Losartan Genven
const OUTPUT_FILE = path.join(__dirname, 'debug_stock.json');

// Credentials from Env
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

async function main() {
    console.log(`Fetching stock for ID: ${TARGET_ID}...`);
    const url = `https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2`;

    try {
        const res = await axios.get(url, {
            params: {
                idItem: TARGET_ID,
                token: TOKEN,
                tokenIdWebSafe: TOKEN_ID_WEBSAFE,
                key: KEY
            },
            headers: HEADERS_API
        });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(res.data, null, 2));
        console.log(`Saved response to ${OUTPUT_FILE}`);

        // Quick peek for price fields
        const keys = Object.keys(res.data);
        console.log("Top level keys:", keys);
        if (res.data.detail) console.log("Detail keys:", Object.keys(res.data.detail));

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error("Data:", e.response.data);
    }
}

main();
