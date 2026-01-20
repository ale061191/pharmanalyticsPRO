/**
 * Script para verificar si hay campos de país en los productos
 */
const https = require('https');

const APP_ID = 'VCOJEYD2PO';
const API_KEY = '869a91e98550dd668b8b1dc04bca9011';

async function searchProducts(query, hitsPerPage = 5) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            query: query,
            hitsPerPage: hitsPerPage
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
    console.log('🔍 Verificando campos de país/tienda en productos...\n');

    const result = await searchProducts('', 10);

    console.log(`Total productos: ${result.nbHits}\n`);

    // Analizar todos los campos únicos buscando país/store/location
    const relevantFields = ['idStoreGroup', 'storeGroup', 'country', 'pais', 'region', 'store', 'tienda', 'sucursal'];

    console.log('📋 Campos relacionados con ubicación:\n');

    result.hits.forEach((hit, i) => {
        console.log(`Producto ${i + 1}: idStoreGroup=${hit.idStoreGroup}`);

        // Mostrar cualquier campo que pueda indicar país
        Object.keys(hit).forEach(key => {
            if (relevantFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
                console.log(`   ${key}: ${hit[key]}`);
            }
        });
    });

    // Ver estadísticas por idStoreGroup
    console.log('\n\n📊 Verificando idStoreGroup único...');

    // Buscar 100 productos para ver la distribución
    const largerSample = await searchProducts('', 100);
    const storeGroups = {};

    largerSample.hits.forEach(hit => {
        const sg = hit.idStoreGroup || 'N/A';
        storeGroups[sg] = (storeGroups[sg] || 0) + 1;
    });

    console.log('Distribución por idStoreGroup (de 100 productos):');
    Object.entries(storeGroups).sort((a, b) => b[1] - a[1]).forEach(([group, count]) => {
        console.log(`   StoreGroup ${group}: ${count} productos`);
    });

    // Verificar qué storeGroup es Venezuela
    console.log('\n\n🇻🇪 Buscando productos específicos de Venezuela...');

    // Buscar producto con precio típico de Venezuela
    const venezuelaSearch = await searchProducts('Calox', 5);
    console.log('\nProductos CALOX (lab venezolano):');
    venezuelaSearch.hits.forEach(hit => {
        console.log(`  ${hit.description?.substring(0, 40)} - idStoreGroup: ${hit.idStoreGroup} - Precio: ${hit.fullPrice}`);
    });
}

main();
