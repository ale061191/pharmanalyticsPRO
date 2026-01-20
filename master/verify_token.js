
const axios = require('axios');

// Captured from Browser
const TOKEN = '65e50762cac1a844df5f2d9108065d78';
const TOKEN_ID_WEBSAFE = 'ahZzfm9yYWNsZS1zZXJ2aWNlcy12emxhcl0LEgRVc2VyIiRkZDBiZGU0NS1iOGUxLTQ0ZjAtODU0Yi0xYTJjNDExMWY5MTgMCxIFVG9rZW4iJGExMWY0MWM5LWVmZDUtNGI1Zi1hYmVhLWY5NTBjM2VlZWEyYQw';
const KEY = 'AIzaSyAidR6Tt0K60gACR78aWThMQb7L5u6Wpag';
const AUTH_HEADER = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzYS13ZWJAZmFybWF0b2RvLWJhY2tlbmQtcHJvZC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsImF1ZCI6IldFQiIsImlzcyI6InNhLXdlYkBmYXJtYXRvZG8tYmFja2VuZC1wcm9kLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwiZXhwIjoxNzY4MjcxMzUwLCJpYXQiOjE3NjgyNjc3NTAsImNvdW50cnkiOiJWRSIsImN1c3RvbWVySWQiOiJhbm9ueW1vdXNfNjU3YzgwOGYtMDA4ZS00NzQ0LTk1YmMtOTUyZmJhZDJlYWQxIiwiaXBBZGRyZXNzIjoiMTg1LjEwNy41Ny44IiwiaXNSZWZyZXNoVG9rZW4iOiJmYWxzZSIsInNlc3Npb25JZCI6InNlc3Npb25fZmU2MmUzOTctNDUxNi00NTdkLTllYTEtODJiODNjYjVmNzIwIiwiZGV2aWNlSWQiOiJBTk9OSU1PIn0.YiyU8ls85yE0Bddm9tOS8ui3ilNrrUMKXmmrFNYdHeaiZHIewZSuIdT_3rqEeaWG9iVOOba1crdtccrKvAqfgJn0irOZ9H4FNiQ06CNceeW0xRisOuElBm0lGLEXN1_pTyMkS-txyVGrQVQr8L8-Bb4IdCHflOl-uh2_Q0m6TizXFnfZiCBwyy2EbxcpOB48IXbOGKgA-n9PvQ7mCsRtvVbpp9hAcZ2LvVuElrybmvSKNbPsQy6V1Oc02p8jk9D9rFL_kt45e0dF94RCIggYz18QljDQ_fdsJ7niV1qWC3uB1Q0nLyPSyM3k_ZHl20-uZAeDkAmWcTNzN3viie2Aag';

const ID_CONTROL = '111026723'; // Atamel (Known Good)
const ID_EXPERIMENT = '113014353'; // Vitamina C (Test Reuse)

// Headers identified from successful browser intercept
const HEADERS_API = {
    'DEVICE-ID': '33d3f30e-cc88-eb7c-3af7-a18b54e1b145',
    'country': 'VEN',
    'source': 'WEB',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.farmatodo.com.ve',
    'Referer': 'https://www.farmatodo.com.ve/'
};

async function checkStock(id) {
    const baseUrl = `https://gw-backend-ve.farmatodo.com/_ah/api/productEndpoint/getItemAvailableStoresCity2`;
    const params = {
        idItem: id,
        token: TOKEN,
        tokenIdWebSafe: TOKEN_ID_WEBSAFE,
        key: KEY
    };

    try {
        console.log(`\n--- Attempting GET for ID: ${id} ---`);
        const response = await axios.get(baseUrl, {
            params: params,
            headers: HEADERS_API
        });

        console.log(`[SUCCESS] GET Status: ${response.status}`);
        console.log("Data Preview:", JSON.stringify(response.data).substring(0, 200));

    } catch (error) {
        console.log(`[FAILED] GET for ID: ${id}`);
        if (error.response) {
            console.log("Status:", error.response.status);
            // console.log("Data Preview:", JSON.stringify(error.response.data).substring(0, 200));
        } else {
            console.log(error.message);
        }
    }
}


async function main() {
    console.log("Testing Control ID (The one seen in browser)...");
    await checkStock(ID_CONTROL);

    console.log("Testing Experiment ID (A different product using SAME tokens)...");
    await checkStock(ID_EXPERIMENT);
}

main();
