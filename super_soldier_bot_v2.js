/**
 * 🦾 SUPER SOLDIER BOT V2 - Farmatodo Scraper
 * 
 * Versión mejorada con navegación directa a URLs de búsqueda
 * No interactúa con inputs, navega directamente a las URLs
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const CONFIG = {
    headless: false,
    timeout: 45000,
    searchTerms: ['acetaminofen', 'ibuprofeno', 'losartan', 'omeprazol', 'metformina'],
    productsPerSearch: 4
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1)) + min);

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   🦾 SUPER SOLDIER BOT V2 - Navegación Directa');
    console.log('═══════════════════════════════════════════════════\n');

    const browser = await puppeteer.launch({
        headless: CONFIG.headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Anti-detection
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const allProducts = [];

    // Interceptar respuestas de API
    const capturedProducts = [];
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/api/') && url.includes('product')) {
            try {
                const json = await response.json();
                if (Array.isArray(json)) {
                    capturedProducts.push(...json);
                } else if (json.data && Array.isArray(json.data)) {
                    capturedProducts.push(...json.data);
                } else if (json.products && Array.isArray(json.products)) {
                    capturedProducts.push(...json.products);
                }
            } catch (e) { }
        }
    });

    try {
        for (const term of CONFIG.searchTerms) {
            console.log(`\n🔍 Buscando: "${term}"`);

            // Navegar directamente a la URL de búsqueda
            const searchUrl = `https://www.farmatodo.com.ve/search?q=${encodeURIComponent(term)}`;

            try {
                await page.goto(searchUrl, {
                    waitUntil: 'networkidle0',
                    timeout: CONFIG.timeout
                });

                // Esperar a que cargue el contenido
                await randomDelay(4000, 6000);

                // Scroll para cargar más productos
                for (let i = 0; i < 3; i++) {
                    await page.evaluate(() => window.scrollBy(0, 500));
                    await delay(1000);
                }

                // Tomar screenshot para debugging
                await page.screenshot({ path: `debug_search_${term}.png` });

                // Extraer productos de la página
                const products = await page.evaluate(() => {
                    const items = [];

                    // Buscar todos los enlaces a productos
                    const links = document.querySelectorAll('a[href*="/producto/"]');
                    const seen = new Set();

                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (seen.has(href)) return;
                        seen.add(href);

                        const url = href.startsWith('http') ? href : `https://www.farmatodo.com.ve${href}`;

                        // Buscar el contenedor padre
                        let container = link.closest('[class*="ProductCard"]') ||
                            link.closest('[class*="product"]') ||
                            link.closest('article') ||
                            link.parentElement?.parentElement?.parentElement;

                        let name = null;
                        let price = null;
                        let originalPrice = null;
                        let discount = null;
                        let image = null;

                        if (container) {
                            // Nombre
                            const nameEl = container.querySelector('h2, h3, [class*="name"], [class*="title"]');
                            name = nameEl?.textContent?.trim() || link.textContent?.trim();

                            // Imagen
                            const img = container.querySelector('img');
                            image = img?.src || img?.dataset?.src;

                            // Precios - buscar en el texto del contenedor
                            const text = container.innerText || '';
                            const priceMatches = text.match(/Bs\.?\s*([\d.,]+)/g) || [];

                            if (priceMatches.length > 0) {
                                const prices = priceMatches.map(m => {
                                    const num = m.match(/[\d.,]+/)[0];
                                    return parseFloat(num.replace(/\./g, '').replace(',', '.'));
                                }).filter(p => p > 0 && p < 50000);

                                prices.sort((a, b) => a - b);
                                if (prices.length > 0) {
                                    price = prices[0]; // Precio más bajo = actual
                                    if (prices.length > 1) originalPrice = prices[prices.length - 1];
                                }
                            }

                            // Descuento
                            const discountMatch = text.match(/(\d+)%/);
                            if (discountMatch) discount = parseInt(discountMatch[1]);
                        }

                        if (name && name.length > 3) {
                            items.push({ name, url, price, originalPrice, discount, image });
                        }
                    });

                    return items;
                });

                console.log(`   📦 Encontrados: ${products.length} productos`);

                // Visitar cada producto para obtener detalles completos
                for (const product of products.slice(0, CONFIG.productsPerSearch)) {
                    if (allProducts.find(p => p.url === product.url)) continue;

                    console.log(`\n   → Detalles: ${product.name?.substring(0, 50)}...`);

                    try {
                        await page.goto(product.url, {
                            waitUntil: 'networkidle0',
                            timeout: 30000
                        });
                        await randomDelay(2000, 4000);

                        const details = await page.evaluate(() => {
                            const name = document.querySelector('h1')?.textContent?.trim();

                            // Buscar precios
                            const text = document.body.innerText;
                            const priceMatches = text.match(/Bs\.?\s*([\d.,]+)/g) || [];
                            const prices = priceMatches.map(m => {
                                const num = m.match(/[\d.,]+/)[0];
                                return parseFloat(num.replace(/\./g, '').replace(',', '.'));
                            }).filter(p => p > 0 && p < 50000).sort((a, b) => a - b);

                            const price = prices[0] || null;
                            const originalPrice = prices.length > 1 ? prices[prices.length - 1] : null;

                            // Descuento
                            const discountMatch = text.match(/(\d+)%\s*(?:dto|desc|off|menos)/i);
                            const discount = discountMatch ? parseInt(discountMatch[1]) : null;

                            // Laboratorio
                            let lab = null;
                            const labPatterns = ['Genfar', 'Calox', 'La Santé', 'MK', 'Genven', 'Bayer',
                                'Pfizer', 'Merck', 'Abbott', 'Procaps', 'Roemmers'];
                            for (const pattern of labPatterns) {
                                if (text.includes(pattern)) {
                                    lab = pattern;
                                    break;
                                }
                            }

                            // Si no encuentra laboratorio, buscar en título
                            if (!lab && name) {
                                for (const pattern of labPatterns) {
                                    if (name.includes(pattern)) {
                                        lab = pattern;
                                        break;
                                    }
                                }
                            }

                            // Imagen
                            const image = document.querySelector('[class*="product"] img')?.src ||
                                document.querySelector('main img')?.src;

                            return { name, price, originalPrice, discount, lab, image, url: window.location.href };
                        });

                        if (details.name && details.price) {
                            allProducts.push(details);
                            console.log(`     ✓ Bs.${details.price}${details.discount ? ` (-${details.discount}%)` : ''} | ${details.lab || 'N/A'}`);
                        }
                    } catch (e) {
                        console.log(`     ❌ Error: ${e.message}`);
                    }

                    await randomDelay(1500, 3000);
                }
            } catch (e) {
                console.log(`   ❌ Error buscando "${term}": ${e.message}`);
            }

            await randomDelay(3000, 5000);
        }
    } finally {
        await browser.close();
    }

    // También agregar productos de API si los capturamos
    console.log(`\n📡 Productos de API capturados: ${capturedProducts.length}`);

    // Guardar resultados
    const output = {
        timestamp: new Date().toISOString(),
        count: allProducts.length,
        products: allProducts
    };

    fs.writeFileSync('farmatodo_products_real.json', JSON.stringify(output, null, 2));

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`   📊 TOTAL: ${allProducts.length} productos reales`);
    console.log('═══════════════════════════════════════════════════\n');

    allProducts.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name?.substring(0, 50)}`);
        console.log(`   Bs.${p.price} | ${p.lab || 'N/A'}${p.discount ? ` | -${p.discount}%` : ''}`);
    });

    console.log('\n💾 Guardado en: farmatodo_products_real.json');
}

main().catch(console.error);
