const axios = require('axios');
const fs = require('fs');

const CITIES_URL = 'https://api-transactional.farmatodo.com/catalog/r/VE/v1/cities/active/locations/';
const STORES_URL = 'https://api-transactional.farmatodo.com/route/r/VE/v1/stores/nearby';
// Key identified by browser subagent
const API_KEY = 'AIzaSyAidR6Tt0K60gACR78aWThMQb7L5u6Wpag';

(async () => {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://www.farmatodo.com.ve',
            'Referer': 'https://www.farmatodo.com.ve/'
        };

        // 1. Fetch Cities
        console.log('Fetching cities from Transactional API...');
        // Try appending key just in case, though headers might be enough or key is query param
        const citiesRes = await axios.get(`${CITIES_URL}?key=${API_KEY}`, { headers });
        const cities = citiesRes.data; // Expected: Array of objects with cityId (e.g. "CCS")
        console.log(`Found ${cities.length} cities.`);

        // 2. Fetch Stores for each city
        console.log('Fetching stores for each city...');
        let allStores = [];

        // Use a concurrency limit or sequential to be polite
        for (const city of cities) {
            // Adjust property access based on actual response structure. 
            // Subagent said: "Common City IDs: Caracas: CCS". 
            // Let's assume city object has 'id' or 'cityId'.
            const cityId = city.id || city.cityId || city.code;

            if (!cityId) {
                console.warn('Skipping city with no ID:', city);
                continue;
            }

            try {
                // console.log(`Fetching stores for ${cityId}...`);
                const storesRes = await axios.get(`${STORES_URL}?cityId=${cityId}&key=${API_KEY}`, { headers });
                const stores = storesRes.data;

                if (Array.isArray(stores)) {
                    // Add cityId to each store for reference
                    stores.forEach(s => s.cityId = cityId);
                    allStores.push(...stores);
                }
            } catch (err) {
                console.error(`Failed to fetch stores for ${cityId}: ${err.message}`);
            }

            // Short delay
            await new Promise(r => setTimeout(r, 100));
        }

        console.log(`Total stores found: ${allStores.length}`);

        fs.writeFileSync('master/cities.json', JSON.stringify(cities, null, 2));
        fs.writeFileSync('master/stores.json', JSON.stringify(allStores, null, 2));

        console.log('Saved to master/cities.json and master/stores.json');

        // Preview
        if (cities.length > 0) console.log('City Example:', cities[0]);
        if (allStores.length > 0) console.log('Store Example:', allStores[0]);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data).substring(0, 200));
        }
    }
})();
