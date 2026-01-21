const fs = require('fs');

async function debugHybridToFile() {
    const productId = '113354489';
    const productName = 'IBUPROFENO 400 MG 10 TABLETAS - GENVEN';
    const url = `http://localhost:3000/api/stock/hybrid?product_name=${encodeURIComponent(productName)}&product_id=${productId}`;

    console.log("Fetching:", url);

    try {
        // Try native fetch first
        const res = await fetch(url);
        const json = await res.json();

        fs.writeFileSync('c:\\Users\\Usuario\\Documents\\pharmanalytics\\api_response_dump.json', JSON.stringify(json, null, 2));
        console.log("SUCCESS: Dumped to api_response_dump.json");

    } catch (e) {
        console.log("Native fetch failed or error occurred. Error:", e.message);
        // Fallback to http if needed (but native fetch should work on modern node)
    }
}

debugHybridToFile();
