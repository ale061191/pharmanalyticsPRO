/**
 * 🦾 SUPER SOLDIER BOT - Farmatodo Scraper Avanzado
 * 
 * Características:
 * - Anti-detección con puppeteer-extra-plugin-stealth
 * - Simulación de comportamiento humano
 * - Búsqueda interactiva en el buscador
 * - Retry automático con backoff exponencial
 * - Extracción precisa de precios con descuento
 * - Captura de laboratorio desde la página del producto
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

// Activar modo stealth para evadir detección
puppeteer.use(StealthPlugin());

// ============ CONFIGURACIÓN ============
const CONFIG = {
    headless: false, // Ver el proceso para debugging
    timeout: 60000,
    retries: 3,
    searchTerms: [
        'acetaminofen',
        'ibuprofeno',
        'losartan',
        'omeprazol',
        'metformina',
        'loratadina',
        'vitamina c',
        'amoxicilina',
        'diclofenaco',
        'enalapril'
    ],
    productsPerSearch: 3, // Productos por búsqueda
    delays: {
        typing: { min: 50, max: 150 },    // Delay entre teclas
        click: { min: 500, max: 1500 },    // Delay después de click
        scroll: { min: 1000, max: 2000 },  // Delay después de scroll
        page: { min: 3000, max: 6000 },    // Delay entre páginas
    }
};

// ============ UTILIDADES ============
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1)) + min);

// Simular movimiento de mouse humano
async function humanMouseMove(page, x, y) {
    const steps = Math.floor(Math.random() * 5) + 3;
    const currentPos = await page.evaluate(() => ({ x: window.mouseX || 0, y: window.mouseY || 0 }));

    for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const newX = currentPos.x + (x - currentPos.x) * progress;
        const newY = currentPos.y + (y - currentPos.y) * progress;
        await page.mouse.move(newX, newY);
        await delay(Math.random() * 20);
    }
}

// Tipear como humano
async function humanType(page, selector, text) {
    await page.click(selector);
    await randomDelay(300, 600);

    for (const char of text) {
        await page.keyboard.type(char);
        await randomDelay(CONFIG.delays.typing.min, CONFIG.delays.typing.max);
    }
}

// Scroll suave
async function humanScroll(page, distance = 300) {
    await page.evaluate((dist) => {
        window.scrollBy({ top: dist, behavior: 'smooth' });
    }, distance);
    await randomDelay(CONFIG.delays.scroll.min, CONFIG.delays.scroll.max);
}

// Retry con backoff exponencial
async function retryWithBackoff(fn, maxRetries = CONFIG.retries) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
            console.log(`⚠️ Intento ${i + 1} falló, reintentando en ${Math.round(waitTime / 1000)}s...`);
            await delay(waitTime);
        }
    }
}

// ============ BROWSER SETUP ============
async function createStealthBrowser() {
    console.log('🚀 Iniciando Super Soldier Bot...\n');

    const browser = await puppeteer.launch({
        headless: CONFIG.headless,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080',
            '--start-maximized',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });

    const page = await browser.newPage();

    // Configurar para parecer navegador real
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Ocultar webdriver
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['es-VE', 'es', 'en-US', 'en'] });
        window.chrome = { runtime: {} };
    });

    // Configurar headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-VE,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    return { browser, page };
}

// ============ SCRAPING FUNCTIONS ============

// Buscar productos usando el buscador de Farmatodo
async function searchProducts(page, searchTerm) {
    console.log(`\n🔍 Buscando: "${searchTerm}"`);

    return await retryWithBackoff(async () => {
        // Ir a la página principal primero
        await page.goto('https://www.farmatodo.com.ve/', {
            waitUntil: 'networkidle2',
            timeout: CONFIG.timeout
        });
        await randomDelay(CONFIG.delays.page.min, CONFIG.delays.page.max);

        // Buscar el input de búsqueda
        const searchSelectors = [
            'input[type="search"]',
            'input[placeholder*="uscar"]',
            'input[placeholder*="Buscar"]',
            'input[name="q"]',
            'input[name="search"]',
            '.search-input',
            '#search',
            '[data-testid="search"]',
            'input[class*="search"]'
        ];

        let searchInput = null;
        for (const selector of searchSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                searchInput = await page.$(selector);
                if (searchInput) {
                    console.log(`   ✓ Input encontrado: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!searchInput) {
            // Tomar screenshot para debugging
            await page.screenshot({ path: 'debug_search.png' });
            console.log('   ⚠️ No se encontró input, buscando en el DOM...');

            // Buscar cualquier input visible
            const allInputs = await page.$$eval('input', inputs =>
                inputs.map(i => ({
                    type: i.type,
                    placeholder: i.placeholder,
                    className: i.className,
                    id: i.id
                }))
            );
            console.log('   Inputs encontrados:', allInputs);
            throw new Error('Input de búsqueda no encontrado');
        }

        // Limpiar y escribir en el buscador
        await searchInput.click({ clickCount: 3 }); // Seleccionar todo
        await delay(300);
        await humanType(page, searchSelectors.find(s => page.$(s)), searchTerm);
        await randomDelay(500, 1000);

        // Presionar Enter
        await page.keyboard.press('Enter');
        console.log(`   ⏳ Esperando resultados...`);

        // Esperar a que carguen los resultados
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeout });
        await randomDelay(CONFIG.delays.page.min, CONFIG.delays.page.max);

        // Hacer scroll para cargar más productos
        await humanScroll(page, 500);
        await humanScroll(page, 500);

        // Extraer productos
        const products = await page.evaluate(() => {
            const items = [];

            // Buscar enlaces a productos
            const productLinks = document.querySelectorAll('a[href*="/producto/"]');

            productLinks.forEach((link, index) => {
                if (index >= 5) return; // Limitar a 5 por búsqueda

                const href = link.getAttribute('href');
                const url = href.startsWith('http') ? href : `https://www.farmatodo.com.ve${href}`;

                // Buscar el contenedor padre para extraer más datos
                const container = link.closest('[class*="card"]') ||
                    link.closest('[class*="product"]') ||
                    link.closest('article') ||
                    link.parentElement?.parentElement;

                let name = link.textContent?.trim();
                let price = null;
                let originalPrice = null;
                let discount = null;
                let image = null;

                if (container) {
                    // Buscar nombre
                    const nameEl = container.querySelector('h2, h3, h4, [class*="name"], [class*="title"]');
                    if (nameEl) name = nameEl.textContent?.trim();

                    // Buscar precios
                    const priceTexts = container.innerText.match(/Bs\.?\s*([\d.,]+)/g) || [];
                    if (priceTexts.length > 0) {
                        // El primer precio es usualmente el actual (con descuento)
                        const match = priceTexts[0].match(/Bs\.?\s*([\d.,]+)/);
                        if (match) {
                            price = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
                        }
                        // El segundo puede ser el original
                        if (priceTexts.length > 1) {
                            const origMatch = priceTexts[1].match(/Bs\.?\s*([\d.,]+)/);
                            if (origMatch) {
                                originalPrice = parseFloat(origMatch[1].replace(/\./g, '').replace(',', '.'));
                            }
                        }
                    }

                    // Buscar descuento
                    const discountMatch = container.innerText.match(/(\d+)%/);
                    if (discountMatch) {
                        discount = parseInt(discountMatch[1]);
                    }

                    // Buscar imagen
                    const img = container.querySelector('img');
                    if (img) image = img.src || img.dataset.src;
                }

                if (name && url) {
                    items.push({ name, url, price, originalPrice, discount, image });
                }
            });

            return items;
        });

        console.log(`   ✓ Encontrados: ${products.length} productos`);
        return products;
    });
}

// Extraer detalles completos de un producto
async function scrapeProductDetails(page, productUrl) {
    console.log(`\n📦 Extrayendo: ${productUrl.substring(0, 60)}...`);

    return await retryWithBackoff(async () => {
        await page.goto(productUrl, {
            waitUntil: 'networkidle2',
            timeout: CONFIG.timeout
        });
        await randomDelay(CONFIG.delays.page.min, CONFIG.delays.page.max);

        // Hacer scroll para asegurar carga completa
        await humanScroll(page, 300);
        await humanScroll(page, 300);

        const details = await page.evaluate(() => {
            // Nombre - buscar en h1 principalmente
            const name = document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('[class*="product-name"]')?.textContent?.trim() ||
                document.querySelector('[class*="title"]')?.textContent?.trim();

            // Precio actual (con descuento si aplica)
            let price = null;
            let originalPrice = null;
            let discount = null;

            const pageText = document.body.innerText;

            // Buscar todos los precios en la página
            const priceMatches = pageText.match(/Bs\.?\s*([\d.,]+)/g) || [];
            const prices = priceMatches.map(m => {
                const num = m.match(/Bs\.?\s*([\d.,]+)/)[1];
                return parseFloat(num.replace(/\./g, '').replace(',', '.'));
            }).filter(p => p > 0 && p < 100000); // Filtrar precios razonables

            if (prices.length > 0) {
                // Ordenar para encontrar el menor (precio con descuento)
                prices.sort((a, b) => a - b);
                price = prices[0]; // Precio más bajo = precio actual
                if (prices.length > 1 && prices[prices.length - 1] > price * 1.05) {
                    originalPrice = prices[prices.length - 1]; // Precio más alto = original
                }
            }

            // Buscar descuento explícito
            const discountMatch = pageText.match(/(\d+)%\s*(?:dto|descuento|off|menos)/i);
            if (discountMatch) {
                discount = parseInt(discountMatch[1]);
            } else if (originalPrice && price) {
                // Calcular descuento si no está explícito
                discount = Math.round((1 - price / originalPrice) * 100);
            }

            // Laboratorio - buscar patrones conocidos
            let lab = null;
            const labPatterns = [
                'Genfar', 'Calox', 'La Santé', 'MK', 'Genven', 'Bayer', 'Pfizer',
                'Merck', 'Abbott', 'Roche', 'Novartis', 'Sanofi', 'GSK', 'Teva',
                'Procaps', 'Tecnoquimicas', 'Roemmers', 'Bago', 'Grünenthal',
                'Laboratorios', 'Farmacéuticos', 'Vargas', 'Meyer', 'Leti'
            ];

            for (const pattern of labPatterns) {
                if (pageText.includes(pattern)) {
                    lab = pattern;
                    break;
                }
            }

            // Si no encuentra, buscar en elementos específicos
            if (!lab) {
                const labElements = document.querySelectorAll('[class*="brand"], [class*="lab"], [class*="manufacturer"]');
                for (const el of labElements) {
                    if (el.textContent?.trim()) {
                        lab = el.textContent.trim();
                        break;
                    }
                }
            }

            // Imagen del producto
            const image = document.querySelector('[class*="product"] img')?.src ||
                document.querySelector('.product-image img')?.src ||
                document.querySelector('[class*="gallery"] img')?.src ||
                document.querySelector('main img')?.src;

            // Categoría
            const breadcrumb = document.querySelector('[class*="breadcrumb"]');
            let category = 'Salud';
            if (breadcrumb) {
                const links = breadcrumb.querySelectorAll('a');
                if (links.length > 1) {
                    category = links[1]?.textContent?.trim() || 'Salud';
                }
            }

            return {
                name,
                price,
                originalPrice,
                discount,
                lab,
                image,
                category,
                url: window.location.href
            };
        });

        if (details.name && details.price) {
            console.log(`   ✓ ${details.name}`);
            console.log(`     💰 Bs.${details.price}${details.originalPrice ? ` (antes Bs.${details.originalPrice})` : ''}`);
            console.log(`     🏭 ${details.lab || 'Lab no identificado'}`);
            if (details.discount) console.log(`     🏷️ ${details.discount}% descuento`);
        }

        return details;
    });
}

// ============ MAIN ============
async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   🦾 SUPER SOLDIER BOT - Farmatodo Scraper');
    console.log('═══════════════════════════════════════════════════\n');

    let browser, page;
    const allProducts = [];

    try {
        ({ browser, page } = await createStealthBrowser());

        // Primero, visitar la página principal para establecer cookies
        console.log('📍 Visitando Farmatodo...');
        await page.goto('https://www.farmatodo.com.ve/', {
            waitUntil: 'networkidle2',
            timeout: CONFIG.timeout
        });
        await randomDelay(3000, 5000);

        // Simular comportamiento humano inicial
        await humanScroll(page, 300);
        await humanScroll(page, 300);
        await randomDelay(2000, 3000);

        // Buscar productos
        for (const term of CONFIG.searchTerms) {
            try {
                const products = await searchProducts(page, term);

                for (const product of products.slice(0, CONFIG.productsPerSearch)) {
                    // Evitar duplicados
                    if (allProducts.find(p => p.url === product.url)) continue;

                    try {
                        const details = await scrapeProductDetails(page, product.url);
                        if (details.name && details.price) {
                            allProducts.push(details);
                        }
                    } catch (e) {
                        console.log(`   ⚠️ Error en producto: ${e.message}`);
                    }

                    await randomDelay(CONFIG.delays.page.min, CONFIG.delays.page.max);
                }
            } catch (e) {
                console.log(`⚠️ Error buscando "${term}": ${e.message}`);
            }

            // Delay entre búsquedas
            await randomDelay(3000, 5000);
        }

    } catch (error) {
        console.error('🔥 Error crítico:', error.message);
    } finally {
        if (browser) await browser.close();
    }

    // Guardar resultados
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`   📊 RESUMEN: ${allProducts.length} productos extraídos`);
    console.log('═══════════════════════════════════════════════════\n');

    const output = {
        timestamp: new Date().toISOString(),
        count: allProducts.length,
        products: allProducts
    };

    fs.writeFileSync('farmatodo_products_real.json', JSON.stringify(output, null, 2));
    console.log('💾 Guardado en: farmatodo_products_real.json\n');

    // Mostrar tabla de resultados
    console.log('Productos encontrados:');
    console.log('─'.repeat(80));
    allProducts.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name?.substring(0, 40)}`);
        console.log(`   Bs.${p.price} | ${p.lab || 'N/A'} | ${p.discount ? p.discount + '% dto' : ''}`);
    });
}

main().catch(console.error);
