const fetch = require('node-fetch');

async function debugHybridReal() {
    const productId = '113354489';
    const productName = 'IBUPROFENO 400 MG 10 TABLETAS - GENVEN'; // Example name

    // Mimic the exact call from frontend
    const url = `http://localhost:3000/api/stock/hybrid?product_name=${encodeURIComponent(productName)}&product_id=${productId}`;

    console.log("🔍 Debugging URL:", url);

    try {
        const res = await fetch(url);
        const json = await res.json();

        console.log("------------------------------------------------");
        console.log("✅ Success:", json.success);
        console.log("📦 Product Name:", json.product_name);
        console.log("📡 Source:", json.detail?.source);
        console.log("🏙️ Cities Found:", json.detail?.cities?.length);

        if (json.detail?.cities?.length > 0) {
            // Find Coro specifically
            const coro = json.detail.cities.find(c => c.city.toLowerCase() === 'coro');
            if (coro) {
                console.log("📍 CORO FOUND:");
                console.log(`   - Total Stock: ${coro.total_stock}`);
                console.log(`   - Sectors: ${coro.sectors.length}`);
                console.log(`   - Stores Example: ${JSON.stringify(coro.sectors[0]?.stores[0], null, 2)}`);
            } else {
                console.log("❌ Coro NOT found in response list.");
                // Log first 3 cities to see what we have
                console.log("   First 3 cities:", json.detail.cities.slice(0, 3).map(c => `${c.city}: ${c.total_stock}`));
            }
        } else {
            console.log("❌ No cities returned.");
        }
        console.log("------------------------------------------------");

    } catch (e) {
        console.error("💥 Error:", e);
    }
}

debugHybridReal();
