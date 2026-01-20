/**
 * Script para identificar Venezuela por StoreGroup y códigos de barras
 */
const https = require('https');

const APP_ID = 'VCOJEYD2PO';
const API_KEY = '869a91e98550dd668b8b1dc04bca9011';

async function searchWithFilter(query, filters = '', hitsPerPage = 5) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            query: query,
            hitsPerPage: hitsPerPage,
            filters: filters
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
    console.log('🔍 IDENTIFICANDO VENEZUELA...\n');

    // StoreGroup 2 parece ser el principal
    const sg2 = await searchWithFilter('', 'idStoreGroup:2', 5);
    console.log(`\n📦 StoreGroup 2: ${sg2.nbHits} productos`);
    console.log('   Ejemplos:');
    sg2.hits.forEach(h => {
        console.log(`   - ${h.description?.substring(0, 45)} | Precio: ${h.fullPrice} | Barcode: ${h.barcode?.substring(0, 7)}`);
    });

    // Probar otros store groups
    for (const sg of [1, 94, 1155, 1190]) {
        try {
            const result = await searchWithFilter('', `idStoreGroup:${sg}`, 3);
            if (result.nbHits > 0) {
                console.log(`\n📦 StoreGroup ${sg}: ${result.nbHits} productos`);
                result.hits.forEach(h => {
                    console.log(`   - ${h.description?.substring(0, 45)} | Precio: ${h.fullPrice} | Barcode: ${h.barcode?.substring(0, 7)}`);
                });
            }
        } catch (e) {
            console.log(`   StoreGroup ${sg}: Error - ${e.message}`);
        }
    }

    // Buscar Calox específicamente
    console.log('\n\n🧪 Buscando CALOX (laboratorio venezolano)...');
    const calox = await searchWithFilter('Calox', '', 5);
    console.log(`   Total: ${calox.nbHits} productos`);
    calox.hits.forEach(h => {
        console.log(`   - StoreGroup ${h.idStoreGroup}: ${h.description?.substring(0, 40)} | ${h.fullPrice}`);
    });

    // Verificar precios - Venezuela debería tener precios muy altos en bolívares
    console.log('\n\n💰 Analizando rangos de precios por StoreGroup...');

    // Productos de StoreGroup 2 (posiblemente VE)
    const samples2 = await searchWithFilter('Acetaminofen', 'idStoreGroup:2', 3);
    console.log('\nStoreGroup 2 - Acetaminofén:');
    samples2.hits.forEach(h => {
        console.log(`   ${h.description?.substring(0, 50)} | Precio: ${h.fullPrice?.toLocaleString()}`);
    });

    // Sin filtro
    const samplesAll = await searchWithFilter('Acetaminofen', '', 10);
    console.log('\nTodos los StoreGroups - Acetaminofén:');
    samplesAll.hits.forEach(h => {
        console.log(`   SG${h.idStoreGroup}: ${h.description?.substring(0, 40)} | Precio: ${h.fullPrice?.toLocaleString()}`);
    });
}

main();
