/**
 * Script para analizar productos de Venezuela en Algolia
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

function formatProductName(hit) {
    // Combinar description + detailDescription y limpiar
    let name = '';
    if (hit.description) {
        name = hit.description.replace(/^\/\//, '').trim();
    }
    if (hit.detailDescription) {
        name += ' ' + hit.detailDescription.trim();
    }
    return name.trim().replace(/\s+/g, ' ');
}

async function main() {
    console.log('🔍 Analizando productos de Venezuela en Algolia...\n');

    // Buscar productos de laboratorios venezolanos conocidos
    const searches = [
        { query: 'Calox', desc: 'Laboratorio venezolano CALOX' },
        { query: 'Vivax', desc: 'Laboratorio venezolano VIVAX' },
        { query: 'Nolver', desc: 'Producto venezolano NOLVER' },
        { query: 'Acetaminofen', desc: 'Medicamento común' },
        { query: 'Diclofenaco', desc: 'Medicamento común' },
        { query: 'Ibuprofeno', desc: 'Medicamento común' }
    ];

    for (const search of searches) {
        console.log(`\n📦 Buscando: ${search.desc}`);
        console.log('='.repeat(50));

        const result = await searchProducts(search.query, 3);

        if (result.hits && result.hits.length > 0) {
            result.hits.forEach((hit, i) => {
                const name = formatProductName(hit);
                console.log(`\n${i + 1}. ${name}`);
                console.log(`   Precio: Bs. ${hit.fullPrice?.toLocaleString()} | Oferta: Bs. ${hit.offerPrice?.toLocaleString()}`);
                console.log(`   Marca: ${hit.marca || 'N/A'} | Proveedor: ${hit.supplier || hit.RMS_PROVIDER || 'N/A'}`);
                console.log(`   Stock: ${hit.totalStock || hit.stock || 0}`);
                console.log(`   Código barras: ${hit.barcode}`);
            });
        } else {
            console.log('   No se encontraron productos');
        }
    }

    // Verificar el total de productos
    console.log('\n\n📊 ESTADÍSTICAS GENERALES:');
    console.log('='.repeat(50));

    const allProducts = await searchProducts('', 0);
    console.log(`Total de productos en el índice: ${allProducts.nbHits}`);

    // Buscar productos con oferta
    const withOffer = await searchProducts('', 0);
    // No hay forma directa de filtrar por offerPrice > 0 sin facets

    // Obtener algunos productos aleatorios
    console.log('\n📋 MUESTRA de productos (primeros 5):');
    const sample = await searchProducts('', 5);
    sample.hits.forEach((hit, i) => {
        const name = formatProductName(hit);
        console.log(`${i + 1}. ${name.substring(0, 60)}... - Bs. ${hit.fullPrice?.toLocaleString()}`);
    });
}

main();
