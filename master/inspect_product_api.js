
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Known Product ID (Concor 5mg - we know it has active ingredient from scraping)
const PRODUCT_ID = '116159531';

// Headers from our previous successful scripts (harvest/enrich)
const HEADERS = {
    'accept': 'application/json, text/plain, */*',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'x-device': 'Desktop',
    'x-platform': 'Web',
    'DEVICE-ID': process.env.FARM_DEVICE_ID || '33d3f30e-cc88-eb7c-3af7-a18b54e1b145',
    'country': 'VEN',
    'source': 'WEB',
    'Origin': 'https://www.farmatodo.com.ve',
    'Referer': 'https://www.farmatodo.com.ve/'
};

async function inspectApi() {
    console.log(`Inspecting API data for Product ${PRODUCT_ID}...`);

    const TOKEN = process.env.FARM_TOKEN;
    const TOKEN_ID_WEBSAFE = process.env.FARM_TOKEN_ID;
    const KEY = process.env.FARM_KEY;

    if (!TOKEN) {
        console.error('Missing .env credentials');
        return;
    }

    const url = `https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2?idItem=${PRODUCT_ID}&token=${TOKEN}&tokenIdWebSafe=${TOKEN_ID_WEBSAFE}&key=${KEY}`;

    try {
        const { data } = await axios.get(url, { headers: HEADERS });
        console.log('--- API RESPONSE STRUCTURE ---');
        console.log(JSON.stringify(data, null, 2));

        // Deep search for keywords
        const strData = JSON.stringify(data).toLowerCase();
        console.log('\n--- KEYWORD SEARCH ---');
        console.log('Contains "atc"?', strData.includes('atc'));
        console.log('Contains "principio"?', strData.includes('principio'));
        console.log('Contains "bisoprolol"?', strData.includes('bisoprolol'));

    } catch (e) {
        console.error('API Error:', e.message);
        if (e.response) console.error(e.response.status, e.response.statusText);
    }
}

inspectApi();
