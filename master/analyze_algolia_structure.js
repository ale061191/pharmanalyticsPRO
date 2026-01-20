/**
 * Script para analizar la estructura REAL de los productos en Algolia
 */
const https = require('https');
const fs = require('fs');

const APP_ID = 'VCOJEYD2PO';
const API_KEY = '869a91e98550dd668b8b1dc04bca9011';

async function searchProducts(query) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            query: query,
            hitsPerPage: 3
        });

        const options = {
            hostname: `${APP_ID.toLowerCase()}-dsn.algolia.net`,
            path: `/1/indexes/products/query`,
            method: 'POST',
            headers: {
                'X-Algolia-Application-Id': APP_ID,
                'X-Algolia-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('🔍 Analizando estructura de productos en Algolia...\n');

    const result = await searchProducts('Losartan');

    console.log(`Total hits: ${result.nbHits}\n`);

    if (result.hits && result.hits.length > 0) {
        // Guardar la estructura completa en un archivo
        fs.writeFileSync('master/algolia_product_sample.json', JSON.stringify(result.hits[0], null, 2));
        console.log('✅ Guardado en master/algolia_product_sample.json\n');

        console.log('📋 TODOS LOS CAMPOS disponibles:');
        const allKeys = Object.keys(result.hits[0]);
        allKeys.forEach(key => {
            const value = result.hits[0][key];
            const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 80) : String(value).substring(0, 80);
            console.log(`  ${key}: ${valueStr}`);
        });
    }
}

main();
