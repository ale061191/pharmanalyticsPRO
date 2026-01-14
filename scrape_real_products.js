/**
 * Script para scrapear productos REALES de Farmatodo
 * Extrae: nombre, precio (con descuento), laboratorio, imagen
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const PRODUCT_URLS = [
    'https://www.farmatodo.com.ve/producto/111026723-acetaminofen-atamel-forte-650-mg-x-10-tabletas',
    'https://www.farmatodo.com.ve/producto/100000101-ibuprofeno-genfar-400-mg-x-10-tabletas',
    'https://www.farmatodo.com.ve/producto/100000042-acetaminofen-calox-500-mg-x-10-tabletas',
];

// Buscar productos populares en Farmatodo
const SEARCH_TERMS = ['losartan', 'omeprazol', 'metformina', 'vitamina c', 'loratadina'];

async function scrapeProduct(page, url) {
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        const data = await page.evaluate(() => {
            // Nombre del producto
            const name = document.querySelector('h1')?.textContent?.trim();

            // Precio - buscar precio con descuento primero
            let price = null;
            const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"]');
            for (const el of priceElements) {
                const text = el.textContent || '';
                const match = text.match(/Bs\.?\s*([\d.,]+)/);
                if (match) {
                    let numStr = match[1].replace(/\./g, '').replace(',', '.');
                    price = parseFloat(numStr);
                    break;
                }
            }

            // Si no encuentra, buscar en todo el texto
            if (!price) {
                const bodyText = document.body.innerText;
                const match = bodyText.match(/Bs\.?\s*([\d.,]+)/);
                if (match) {
                    let numStr = match[1].replace(/\./g, '').replace(',', '.');
                    price = parseFloat(numStr);
                }
            }

            // Laboratorio - buscar en metadata o texto
            let lab = null;
            const labPatterns = ['Genfar', 'Calox', 'La Santé', 'MK', 'Genven', 'Bayer', 'Pfizer', 'Merck'];
            const pageText = document.body.innerText;
            for (const pattern of labPatterns) {
                if (pageText.includes(pattern)) {
                    lab = pattern;
                    break;
                }
            }

            // Imagen
            const image = document.querySelector('[class*="product"] img, .product-image img')?.src;

            // Descuento
            let discount = null;
            const discountMatch = pageText.match(/(\d+)%\s*(?:dto|descuento|off)/i);
            if (discountMatch) {
                discount = parseInt(discountMatch[1]);
            }

            return { name, price, lab, image, discount, url: window.location.href };
        });

        console.log(`✅ ${data.name}: Bs.${data.price} [${data.lab || 'N/A'}]`);
        return data;
    } catch (e) {
        console.warn(`❌ Error scraping ${url}: ${e.message}`);
        return null;
    }
}

async function searchProducts(page, term) {
    const products = [];
    try {
        const searchUrl = `https://www.farmatodo.com.ve/search?q=${encodeURIComponent(term)}`;
        console.log(`🔍 Buscando: ${term}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000));

        const results = await page.evaluate(() => {
            const items = [];
            const cards = document.querySelectorAll('a[href*="/producto/"]');

            cards.forEach((card, i) => {
                if (i >= 3) return; // Solo primeros 3

                const href = card.getAttribute('href');
                const name = card.textContent?.trim()?.substring(0, 100);

                // Buscar precio cerca
                let price = null;
                const parent = card.closest('[class*="card"], [class*="product"], article, div');
                if (parent) {
                    const priceText = parent.textContent || '';
                    const match = priceText.match(/Bs\.?\s*([\d.,]+)/);
                    if (match) {
                        let numStr = match[1].replace(/\./g, '').replace(',', '.');
                        price = parseFloat(numStr);
                    }
                }

                if (href && name) {
                    items.push({
                        url: href.startsWith('http') ? href : `https://www.farmatodo.com.ve${href}`,
                        name: name.split('\n')[0].trim(),
                        price
                    });
                }
            });

            return items;
        });

        console.log(`   Encontrados: ${results.length} productos`);
        return results;
    } catch (e) {
        console.warn(`❌ Error buscando ${term}: ${e.message}`);
        return [];
    }
}

async function main() {
    console.log('🚀 Iniciando scraper de productos reales de Farmatodo...\n');

    const browser = await puppeteer.launch({
        headless: false, // Ver el proceso
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const allProducts = [];

    // Buscar productos por término
    for (const term of SEARCH_TERMS) {
        const results = await searchProducts(page, term);
        for (const item of results) {
            if (item.url && !allProducts.find(p => p.url === item.url)) {
                allProducts.push(item);
            }
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n📦 Total productos encontrados: ${allProducts.length}\n`);

    // Obtener detalles de cada producto
    const detailedProducts = [];
    for (const product of allProducts.slice(0, 20)) {
        const details = await scrapeProduct(page, product.url);
        if (details && details.name && details.price) {
            detailedProducts.push(details);
        }
        await new Promise(r => setTimeout(r, 1500));
    }

    await browser.close();

    // Guardar resultados
    const output = {
        timestamp: new Date().toISOString(),
        count: detailedProducts.length,
        products: detailedProducts
    };

    fs.writeFileSync('farmatodo_real_products.json', JSON.stringify(output, null, 2));
    console.log(`\n✅ Guardado en farmatodo_real_products.json`);
    console.log(`📊 Total: ${detailedProducts.length} productos con datos reales`);
}

main().catch(console.error);
