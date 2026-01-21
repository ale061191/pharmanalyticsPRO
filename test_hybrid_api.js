const fetch = require('node-fetch');

async function testHybrid() {
    // Product ID from screenshot is 113354489
    // I need the name. Let's try searching by ID if the API supported it, but I added product_name support mainly.
    // Wait, the API supports product_id param too? 
    // In the code: const productId = searchParams.get('product_id');
    // So I can pass product_id directly!

    const url = 'http://localhost:3000/api/stock/hybrid?product_id=113354489';
    console.log("Fetching:", url);

    try {
        const res = await fetch(url);
        const json = await res.json();

        console.log("Success:", json.success);
        console.log("Source:", json.detail?.source);
        console.log("Cities count:", json.detail?.cities?.length);

        if (json.detail?.cities?.length > 0) {
            console.log("First City:", json.detail.cities[0].city);
            console.log("Total Stock:", json.detail.cities[0].total_stock);
            console.log("Sectors:", JSON.stringify(json.detail.cities[0].sectors, null, 2));
        } else {
            console.log("No cities found in detail.");
        }

    } catch (e) {
        console.error(e);
    }
}

testHybrid();
