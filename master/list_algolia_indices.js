/**
 * Script para listar todos los índices disponibles en Algolia
 */
const https = require('https');

const APP_ID = 'VCOJEYD2PO';
const API_KEY = '869a91e98550dd668b8b1dc04bca9011';

async function listIndices() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: `${APP_ID.toLowerCase()}-dsn.algolia.net`,
            path: '/1/indexes',
            method: 'GET',
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
                console.log('Status:', res.statusCode);
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    console.log('Raw response:', data);
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function testIndex(indexName) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            query: '',
            hitsPerPage: 1
        });

        const options = {
            hostname: `${APP_ID.toLowerCase()}-dsn.algolia.net`,
            path: `/1/indexes/${indexName}/query`,
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
                    resolve({ index: indexName, status: res.statusCode, count: parsed.nbHits || 0, sample: parsed.hits?.[0] });
                } catch (e) {
                    resolve({ index: indexName, status: res.statusCode, error: data.substring(0, 200) });
                }
            });
        });

        req.on('error', (e) => resolve({ index: indexName, error: e.message }));
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log('🔍 Listando índices disponibles en Algolia...\n');

    // Primero intentar listar índices
    try {
        const indices = await listIndices();
        console.log('📋 Índices encontrados:');
        console.log(JSON.stringify(indices, null, 2));
    } catch (e) {
        console.log('❌ No se pudo listar índices (API key puede no tener permisos de listSettings)');
    }

    console.log('\n🧪 Probando índices específicos de Venezuela...\n');

    // Probar varios índices que podrían existir para Venezuela
    const indicesToTest = [
        'products',
        'products-vzla',
        'productos-vzla',
        'productos-venezuela',
        'products-venezuela',
        'products_vzla',
        'productos_vzla',
        'products-ve',
        'productos-ve',
        'productos',
        'categories',
        'categories-vzla',
        'store-products',
        'store-products-vzla',
        'farmatodo-products',
        'farmatodo-vzla',
        'inventory',
        'inventory-vzla',
        'catalog',
        'catalog-vzla'
    ];

    for (const indexName of indicesToTest) {
        const result = await testIndex(indexName);
        if (result.status === 200) {
            console.log(`✅ ${indexName}: ${result.count} productos`);
            if (result.sample) {
                console.log(`   Ejemplo: ${result.sample.name || result.sample.title || JSON.stringify(result.sample).substring(0, 100)}`);
                // Verificar si tiene precios en bolívares
                if (result.sample.offerPrice || result.sample.price || result.sample.fullPrice) {
                    console.log(`   Precio: offerPrice=${result.sample.offerPrice}, fullPrice=${result.sample.fullPrice}, price=${result.sample.price}`);
                }
            }
        } else {
            console.log(`❌ ${indexName}: ${result.error || `Status ${result.status}`}`);
        }
    }

    console.log('\n🔍 Buscando producto específico de Venezuela (Losartán)...\n');

    // Buscar Losartán en el índice products
    const searchBody = JSON.stringify({
        query: 'Losartan',
        hitsPerPage: 5
    });

    const searchOptions = {
        hostname: `${APP_ID.toLowerCase()}-dsn.algolia.net`,
        path: `/1/indexes/products/query`,
        method: 'POST',
        headers: {
            'X-Algolia-Application-Id': APP_ID,
            'X-Algolia-API-Key': API_KEY,
            'Content-Type': 'application/json'
        }
    };

    const searchReq = https.request(searchOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                console.log('📦 Resultados de búsqueda "Losartan":');
                parsed.hits?.forEach((hit, i) => {
                    console.log(`\n${i + 1}. ${hit.name}`);
                    console.log(`   Precio oferta: ${hit.offerPrice} | Precio normal: ${hit.fullPrice}`);
                    console.log(`   Marca: ${hit.brand}`);
                    console.log(`   Categoría: ${hit.category}`);
                    console.log(`   SKU: ${hit.sku}`);
                });
            } catch (e) {
                console.log('Error parseando:', e.message);
            }
        });
    });

    searchReq.write(searchBody);
    searchReq.end();
}

main();
