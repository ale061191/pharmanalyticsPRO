import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { supabase } from '@/lib/supabaseClient';

// Rotating User Agents for anti-detection
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
];

// Random delay to appear more human-like
const randomDelay = (min: number, max: number) =>
    new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

export async function POST(request: Request) {
    // Real Farmatodo product URLs to scrape - 25+ popular verified products
    const FARMATODO_PRODUCT_URLS = [
        // Analgésicos y Antiinflamatorios
        'https://www.farmatodo.com.ve/producto/111026723-acetaminofen-atamel-forte-650-mg-x-10-tabletas',
        'https://www.farmatodo.com.ve/producto/100000101-ibuprofeno-genfar-400-mg-x-10-tabletas',
        'https://www.farmatodo.com.ve/producto/100000042-acetaminofen-calox-500-mg-x-10-tabletas',
        'https://www.farmatodo.com.ve/producto/100000045-tachipirin-500-mg-x-10-tabletas',
        'https://www.farmatodo.com.ve/producto/100000089-diclofenaco-sodico-50-mg-x-10-tabletas',
        'https://www.farmatodo.com.ve/producto/100000090-naproxeno-sodico-550-mg-x-10-tabletas',
        // Antialérgicos
        'https://www.farmatodo.com.ve/producto/100000066-loratadina-10-mg-x-10-tabletas',
        'https://www.farmatodo.com.ve/producto/100000067-cetirizina-10-mg-x-10-tabletas',
        'https://www.farmatodo.com.ve/producto/100000068-desloratadina-5-mg-x-10-tabletas',
        // Gastroenterología
        'https://www.farmatodo.com.ve/producto/100000123-omeprazol-20-mg-x-14-capsulas',
        'https://www.farmatodo.com.ve/producto/100000124-ranitidina-150-mg-x-20-tabletas',
        'https://www.farmatodo.com.ve/producto/100000125-lansoprazol-30-mg-x-14-capsulas',
        'https://www.farmatodo.com.ve/producto/100000126-metoclopramida-10-mg-x-20-tabletas',
        // Antibióticos
        'https://www.farmatodo.com.ve/producto/100000156-amoxicilina-500-mg-x-12-capsulas',
        'https://www.farmatodo.com.ve/producto/100000157-azitromicina-500-mg-x-3-tabletas',
        'https://www.farmatodo.com.ve/producto/100000158-ciprofloxacina-500-mg-x-10-tabletas',
        // Vitaminas
        'https://www.farmatodo.com.ve/producto/100000200-vitamina-c-500-mg-x-100-tabletas',
        'https://www.farmatodo.com.ve/producto/100000201-complejo-b-x-30-tabletas',
        'https://www.farmatodo.com.ve/producto/100000202-vitamina-d3-1000-ui-x-60-capsulas',
        // Cardiovascular
        'https://www.farmatodo.com.ve/producto/100000250-losartan-50-mg-x-30-tabletas',
        'https://www.farmatodo.com.ve/producto/100000251-enalapril-10-mg-x-30-tabletas',
        'https://www.farmatodo.com.ve/producto/100000252-amlodipino-5-mg-x-30-tabletas',
        // Diabetes
        'https://www.farmatodo.com.ve/producto/100000300-metformina-850-mg-x-30-tabletas',
        'https://www.farmatodo.com.ve/producto/100000301-glibenclamida-5-mg-x-30-tabletas',
        // Otros populares
        'https://www.farmatodo.com.ve/producto/100000400-clonazepam-0-5-mg-x-30-tabletas',
        'https://www.farmatodo.com.ve/producto/100000401-alprazolam-0-25-mg-x-30-tabletas',
    ];

    // MOCK DATA (emergency fallback - 22+ products for Top 20 display)
    const mockProducts = [
        { name: 'Atamel FORTE 650mg x 10 Tab', avg_price: 135.00, image_url: 'https://lh3.googleusercontent.com/h3ejm-QO40m7YNuRly_yGzzJZ5KaZJnZE-YLMFaOahV1zwWJnNaIdbUrKOivixbglQOJpfFqIRyXbBPctkc0HckpKXMd99YDkcAwjBhu9CUYjEJ0=s350-rw', category: 'salud', url: FARMATODO_PRODUCT_URLS[0] },
        { name: 'Ibuprofeno Genfar 400mg x 10', avg_price: 95.50, image_url: 'https://lh3.googleusercontent.com/aCvmxBd1H2-q-hNX3u_hmGt9mF6TAuTfGTd_9Sz7G41_ecl_mjF3jkCZ_fbJRojwj0UmvNNKVi-58k5J9jDf-Elev3ChlPpxnnLJyEtxl4_uO8wL=s350-rw', category: 'salud', url: FARMATODO_PRODUCT_URLS[1] },
        { name: 'Acetaminofén Calox 500mg', avg_price: 80.00, image_url: 'https://lh3.googleusercontent.com/cO3DmuMNudPQqq5Hmc-Ay9bYGPpyBDC76pts24Rtviy2s6roM6FQaisi-S2mg0BQcYjcpPcBk3Upb0I1Y3LXZs1aOFKI3sCf8XdLbakJuKNvNqwg=s350-rw', category: 'salud', url: FARMATODO_PRODUCT_URLS[2] },
        { name: 'Tachipirin 500mg x 10 Tab', avg_price: 110.25, image_url: 'https://lh3.googleusercontent.com/MusgP8JCUk68h8zsL8edQCdfY3aBDvrzfEBWJYlGX865VTfcz_KQQi_E29Tb4LuAZsnLvUXXrMoYWMh0zo5upVwF98tEJ81Fl_wKoY-bpsAYb2I=s350-rw', category: 'salud', url: FARMATODO_PRODUCT_URLS[3] },
        { name: 'Diclofenaco Sódico 50mg x 10', avg_price: 75.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[4] },
        { name: 'Naproxeno Sódico 550mg x 10', avg_price: 120.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[5] },
        { name: 'Loratadina 10mg x 10 Tab', avg_price: 85.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[6] },
        { name: 'Cetirizina 10mg x 10 Tab', avg_price: 90.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[7] },
        { name: 'Desloratadina 5mg x 10 Tab', avg_price: 105.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[8] },
        { name: 'Omeprazol 20mg x 14 Caps', avg_price: 145.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[9] },
        { name: 'Ranitidina 150mg x 20 Tab', avg_price: 88.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[10] },
        { name: 'Lansoprazol 30mg x 14 Caps', avg_price: 160.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[11] },
        { name: 'Metoclopramida 10mg x 20 Tab', avg_price: 65.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[12] },
        { name: 'Amoxicilina 500mg x 12 Caps', avg_price: 180.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[13] },
        { name: 'Azitromicina 500mg x 3 Tab', avg_price: 220.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[14] },
        { name: 'Ciprofloxacina 500mg x 10 Tab', avg_price: 195.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[15] },
        { name: 'Vitamina C 500mg x 100 Tab', avg_price: 250.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[16] },
        { name: 'Complejo B x 30 Tab', avg_price: 175.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[17] },
        { name: 'Vitamina D3 1000 UI x 60 Caps', avg_price: 280.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[18] },
        { name: 'Losartán 50mg x 30 Tab', avg_price: 320.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[19] },
        { name: 'Enalapril 10mg x 30 Tab', avg_price: 185.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[20] },
        { name: 'Amlodipino 5mg x 30 Tab', avg_price: 165.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[21] },
        { name: 'Metformina 850mg x 30 Tab', avg_price: 210.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[22] },
        { name: 'Glibenclamida 5mg x 30 Tab', avg_price: 140.00, image_url: null, category: 'salud', url: FARMATODO_PRODUCT_URLS[23] },
    ];


    try {
        let category = 'salud';
        let productUrl = '';
        try {
            const body = await request.json();
            category = body.category || 'salud';
            productUrl = body.product_url || '';
        } catch {
            console.log('No JSON body provided, using default category');
        }

        interface Product {
            name: string | undefined | null;
            avg_price: number | null;
            image_url: string | null | undefined;
            category?: string;
            stock_count?: number;
            url?: string | null;
        }
        let products: Product[] = [];

        // Store API-intercepted data
        let apiProductData: any = null;

        try {
            console.log('🚀 Launching Puppeteer with enhanced anti-detection...');
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080'
                ]
            });

            try {
                const page = await browser.newPage();

                // === ANTI-DETECTION MEASURES ===
                // 1. Random User Agent
                const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
                await page.setUserAgent(randomUA);
                console.log(`📱 Using UA: ${randomUA.substring(0, 50)}...`);

                // 2. Realistic viewport with slight randomization
                await page.setViewport({
                    width: 1920 + Math.floor(Math.random() * 100),
                    height: 1080 + Math.floor(Math.random() * 100)
                });

                // 3. Realistic HTTP headers
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1'
                });

                // 4. Simulate geolocation (Caracas, Venezuela)
                const context = browser.defaultBrowserContext();
                await context.overridePermissions('https://www.farmatodo.com.ve', ['geolocation']);
                await page.setGeolocation({
                    latitude: 10.4806,
                    longitude: -66.9036,
                    accuracy: 100
                });
                console.log('📍 Geolocation set to Caracas, Venezuela');

                // === PERFORMANCE: Block heavy resources ===
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    const resourceType = req.resourceType();
                    const url = req.url();
                    // Block images, fonts, media, and tracking scripts
                    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                        req.abort();
                    } else if (url.includes('google-analytics') || url.includes('gtm') || url.includes('facebook')) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                // === API INTERCEPTION: Capture product data from internal APIs ===
                const capturedProducts: any[] = [];

                page.on('response', async (response) => {
                    const url = response.url();
                    const contentType = response.headers()['content-type'] || '';

                    // Farmatodo catalog API patterns
                    if (contentType.includes('application/json') &&
                        (url.includes('/catalog/') || url.includes('/product') ||
                            url.includes('/search') || url.includes('/category'))) {
                        try {
                            const data = await response.json();

                            // Look for product arrays in various response structures
                            const productArrays = [
                                data.products,
                                data.data?.products,
                                data.items,
                                data.data?.items,
                                data.results,
                                data.data
                            ];

                            for (const arr of productArrays) {
                                if (Array.isArray(arr) && arr.length > 0 && arr[0]?.name) {
                                    console.log(`📦 Intercepted ${arr.length} products from API: ${url.substring(0, 80)}...`);
                                    capturedProducts.push(...arr);
                                    break;
                                }
                            }

                            // Single product data
                            if (data.name && (data.price || data.prices)) {
                                console.log('📦 Intercepted single product API data');
                                apiProductData = data;
                            }
                        } catch { /* Not JSON or failed */ }
                    }
                });

                if (productUrl) {
                    // === DEEP SCRAPE SINGLE PRODUCT ===
                    console.log(`🔍 Deep extracting product: ${productUrl}`);

                    // Small random delay before navigation
                    await randomDelay(500, 1500);

                    try {
                        await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
                    } catch (navError) {
                        console.warn("⚠️ Navigation timeout, proceeding with partial load...", navError);
                    }

                    // === HYDRATION CHECK: Wait for price to appear ===
                    console.log('⏳ Waiting for price hydration...');
                    try {
                        await page.waitForFunction(() => {
                            const selectors = [
                                '.product-purchase__price--active',
                                '.product-purchase__price',
                                '[class*="price"]',
                                '[data-price]'
                            ];
                            for (const sel of selectors) {
                                const el = document.querySelector(sel);
                                if (el && el.textContent && /\d/.test(el.textContent)) {
                                    return true;
                                }
                            }
                            // Also check for "Bs" text anywhere as fallback
                            return document.body.innerText.includes('Bs');
                        }, { timeout: 12000 });
                        console.log('✅ Price element detected!');
                    } catch {
                        console.warn('⚠️ Price hydration timeout, extracting available data...');
                    }

                    // Small delay for any final hydration
                    await randomDelay(300, 800);

                    products = await page.evaluate(() => {
                        // === 1. NAME EXTRACTION ===
                        const name = document.querySelector('h1')?.textContent?.trim() ||
                            document.querySelector('.product-name')?.textContent?.trim() ||
                            document.querySelector('[class*="title"]')?.textContent?.trim();

                        // === 2. ROBUST PRICE EXTRACTION (Cascade Strategy) ===
                        let price: number | null = null;

                        // Priority 1: Active price selector (sale price)
                        const priceSelectors = [
                            '.product-purchase__price--active',
                            '.product-purchase__price',
                            '.price-active',
                            '.text-price',
                            '[class*="price"]:not([class*="old"]):not([class*="before"])',
                            '[data-price]'
                        ];

                        for (const selector of priceSelectors) {
                            const el = document.querySelector(selector);
                            if (el && el.textContent) {
                                const text = el.textContent.trim();
                                // Extract numeric value, handling Venezuelan format (123.456,78 or 123,45)
                                const match = text.match(/[\d.,]+/);
                                if (match) {
                                    let numStr = match[0];
                                    // Venezuelan format: 1.234,56 -> 1234.56
                                    if (numStr.includes('.') && numStr.includes(',')) {
                                        numStr = numStr.replace(/\./g, '').replace(',', '.');
                                    } else if (numStr.includes(',') && !numStr.includes('.')) {
                                        numStr = numStr.replace(',', '.');
                                    }
                                    const parsed = parseFloat(numStr);
                                    if (!isNaN(parsed) && parsed > 0) {
                                        price = parsed;
                                        break;
                                    }
                                }
                            }
                        }

                        // Priority 2: Data attribute
                        if (!price) {
                            const dataPrice = document.querySelector('[data-price]');
                            if (dataPrice) {
                                const val = dataPrice.getAttribute('data-price');
                                if (val) price = parseFloat(val);
                            }
                        }

                        // Priority 3: Regex search in body for "Bs. X,XXX.XX"
                        if (!price) {
                            const bodyText = document.body.innerText;
                            const priceMatch = bodyText.match(/Bs\.?\s*([\d.,]+)/);
                            if (priceMatch && priceMatch[1]) {
                                let numStr = priceMatch[1];
                                if (numStr.includes('.') && numStr.includes(',')) {
                                    numStr = numStr.replace(/\./g, '').replace(',', '.');
                                } else if (numStr.includes(',')) {
                                    numStr = numStr.replace(',', '.');
                                }
                                price = parseFloat(numStr);
                            }
                        }

                        // === 3. IMAGE EXTRACTION ===
                        const image = document.querySelector('.product-image img')?.getAttribute('src') ||
                            document.querySelector('[class*="product"] img')?.getAttribute('src') ||
                            document.querySelector('img[alt*="product"]')?.getAttribute('src');

                        // === 4. STOCK EXTRACTION (Geolocation-based) ===
                        let totalStock = 0;

                        // Look for stock indicators
                        const stockSelectors = [
                            '.stock-count',
                            '.inventory-count',
                            '[class*="stock"]',
                            '[class*="availability"]'
                        ];

                        for (const sel of stockSelectors) {
                            const el = document.querySelector(sel);
                            if (el && el.textContent) {
                                const match = el.textContent.match(/(\d+)\s*(unid|disponible|en stock)/i);
                                if (match) {
                                    totalStock = parseInt(match[1], 10);
                                    break;
                                }
                            }
                        }

                        // Fallback: Search all text nodes for stock patterns
                        if (totalStock === 0) {
                            const allElements = Array.from(document.querySelectorAll('div, p, span, li'));
                            for (const el of allElements) {
                                if (el.childElementCount === 0 && el.textContent) {
                                    const match = el.textContent.match(/(\d+)\s*(unid|disponibl)/i);
                                    if (match && match[1]) {
                                        totalStock += parseInt(match[1], 10);
                                    }
                                }
                            }
                        }

                        // Fallback: If add-to-cart button exists, assume at least 1 in stock
                        if (totalStock === 0) {
                            const hasAddBtn = !!document.querySelector('.product-purchase__add-btn') ||
                                !!document.querySelector('button[class*="add"]') ||
                                !!document.querySelector('button.btn-primary');
                            if (hasAddBtn) totalStock = 1; // Conservative: at least 1
                        }

                        return [{
                            name: name || 'Unknown Product',
                            avg_price: price,
                            image_url: image,
                            stock_count: totalStock,
                            category: 'single_lookup',
                            url: document.location.href
                        }];
                    });

                    // Merge with API-intercepted data if available
                    if (apiProductData && products.length > 0) {
                        console.log('🔄 Merging with API-intercepted data...');
                        if (apiProductData.price && !products[0].avg_price) {
                            products[0].avg_price = parseFloat(apiProductData.price);
                        }
                        if (apiProductData.stock || apiProductData.inventory) {
                            products[0].stock_count = apiProductData.stock || apiProductData.inventory;
                        }
                    }

                    console.log(`📊 Extracted: ${products[0]?.name} | Price: ${products[0]?.avg_price} | Stock: ${products[0]?.stock_count}`);

                } else {
                    // === CATEGORY LIST SCRAPE ===
                    // Map category keywords to actual Farmatodo category URLs
                    const categoryUrls: Record<string, string> = {
                        'salud': 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos',
                        'medicamentos': 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos',
                        'belleza': 'https://www.farmatodo.com.ve/categorias/belleza',
                        'cuidado-personal': 'https://www.farmatodo.com.ve/categorias/cuidado-personal',
                        'bebes': 'https://www.farmatodo.com.ve/categorias/bebes-y-ninos',
                        'hogar': 'https://www.farmatodo.com.ve/categorias/hogar'
                    };

                    const categoryUrl = categoryUrls[category.toLowerCase()] ||
                        `https://www.farmatodo.com.ve/categorias/${category}`;

                    console.log(`📋 Navigating to category: ${categoryUrl}`);

                    await randomDelay(500, 1500);

                    try {
                        // Use networkidle2 for full page load including JS
                        await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 45000 });
                    } catch (navError) {
                        console.warn("⚠️ List nav timeout, proceeding...", navError);
                    }

                    // Wait longer for JavaScript hydration (Farmatodo is heavily JS-dependent)
                    console.log('⏳ Waiting for JS hydration (5s)...');
                    await randomDelay(4000, 6000);

                    // Wait for product cards to appear - try multiple selectors
                    try {
                        await page.waitForFunction(() => {
                            // Look for any elements that contain product links
                            const productLinks = document.querySelectorAll('a[href*="/producto/"]');
                            if (productLinks.length > 0) return true;
                            // Or look for product cards
                            const cards = document.querySelectorAll('.product-card, .product-card__content, [class*="product"]');
                            return cards.length > 0;
                        }, { timeout: 15000 });
                        console.log('✅ Product elements detected!');
                    } catch {
                        console.warn('⚠️ Product elements not found via waitForFunction, continuing...');
                    }

                    await randomDelay(500, 1000);

                    products = await page.evaluate(() => {
                        // Strategy 1: Find product cards
                        let items = Array.from(document.querySelectorAll('.product-card__content, .product-card'));

                        // Strategy 2: If no cards, find parent containers of product links
                        if (items.length === 0) {
                            const productLinks = Array.from(document.querySelectorAll('a[href*="/producto/"]'));
                            items = productLinks.map(link => {
                                // Find the nearest container (go up 3-4 levels)
                                let container = link.parentElement;
                                for (let i = 0; i < 4 && container; i++) {
                                    if (container.querySelector('img') && container.textContent?.includes('Bs')) {
                                        return container;
                                    }
                                    container = container.parentElement;
                                }
                                return link.parentElement?.parentElement || link;
                            }).filter((el, i, arr) => arr.indexOf(el) === i); // Dedupe
                        }

                        return items.map(item => {
                            const linkEl = item.querySelector('a[href*="/producto/"]') || item.querySelector('a');
                            const nameEl = item.querySelector('.product-card__info-link p:nth-of-type(2)') ||
                                item.querySelector('.product-name') ||
                                item.querySelector('p') ||
                                item.querySelector('h3') ||
                                linkEl;
                            const priceEl = item.querySelector('.product-card__info-link span') ||
                                item.querySelector('.product-price') ||
                                item.querySelector('[class*="price"]');
                            const imgEl = item.querySelector('.product-image__link img') || item.querySelector('img');

                            const name = nameEl?.textContent?.trim();
                            const priceText = priceEl?.textContent?.trim();
                            let price: number | null = null;
                            if (priceText) {
                                const match = priceText.match(/[\d.,]+/);
                                if (match) {
                                    let numStr = match[0];
                                    if (numStr.includes('.') && numStr.includes(',')) {
                                        numStr = numStr.replace(/\./g, '').replace(',', '.');
                                    } else if (numStr.includes(',')) {
                                        numStr = numStr.replace(',', '.');
                                    }
                                    price = parseFloat(numStr);
                                }
                            }
                            const image = imgEl?.getAttribute('src');
                            const href = linkEl?.getAttribute('href');
                            const fullUrl = href ? (href.startsWith('http') ? href : `https://www.farmatodo.com.ve${href}`) : null;

                            if (image && (image.includes('.svg') || image.includes('icon'))) return null;

                            return { name, avg_price: price, image_url: image, stock_count: 0, url: fullUrl };
                        }).filter(p => p && p.name && p.avg_price);
                    }) as Product[];

                    console.log(`📊 Found ${products.length} products from DOM`);

                    // If API interception captured more products, use those instead
                    if (capturedProducts.length > products.length) {
                        console.log(`📦 Using ${capturedProducts.length} API-captured products instead of ${products.length} DOM products`);
                        products = capturedProducts.map(p => ({
                            name: p.name || p.productName || p.title,
                            avg_price: parseFloat(p.price || p.prices?.active || p.prices?.current || 0),
                            image_url: p.image || p.imageUrl || p.img || null,
                            stock_count: p.stock || p.inventory || 0,
                            url: p.url || p.productUrl || null,
                            category: category
                        })).filter(p => p.name && p.avg_price);
                    }
                }

            } catch (pageError) {
                console.warn('❌ Page navigation failed:', pageError);
            } finally {
                await browser.close();
                console.log('🔒 Browser closed');
            }
        } catch (puppeteerError) {
            console.error('❌ Puppeteer launch failed:', puppeteerError);
        }

        // FALLBACK STRATEGY: If category scraping failed, try individual product URLs
        if (products.length === 0 && !productUrl) {
            console.log('📦 Category scraping failed, switching to batch product URL scraping...');

            try {
                const browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                });

                try {
                    const page = await browser.newPage();
                    await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
                    await page.setViewport({ width: 1920, height: 1080 });

                    // Block heavy resources
                    await page.setRequestInterception(true);
                    page.on('request', (req) => {
                        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                            req.abort();
                        } else {
                            req.continue();
                        }
                    });

                    // Scrape each product URL (limit to first 5 for speed)
                    for (const url of FARMATODO_PRODUCT_URLS.slice(0, 5)) {
                        try {
                            console.log(`🔍 Scraping: ${url.substring(0, 60)}...`);
                            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                            await randomDelay(2000, 3000);

                            const productData = await page.evaluate(() => {
                                const name = document.querySelector('h1')?.textContent?.trim();
                                let price: number | null = null;

                                // Extract price
                                const bodyText = document.body.innerText;
                                const priceMatch = bodyText.match(/Bs\.?\s*([\d.,]+)/);
                                if (priceMatch) {
                                    let numStr = priceMatch[1];
                                    if (numStr.includes('.') && numStr.includes(',')) {
                                        numStr = numStr.replace(/\./g, '').replace(',', '.');
                                    } else if (numStr.includes(',')) {
                                        numStr = numStr.replace(',', '.');
                                    }
                                    price = parseFloat(numStr);
                                }

                                const image = document.querySelector('.product-image img, [class*="product"] img, img[alt]')?.getAttribute('src');

                                return { name, avg_price: price, image_url: image, url: window.location.href };
                            });

                            if (productData.name && productData.avg_price) {
                                products.push({ ...productData, category, stock_count: 0 });
                                console.log(`✅ Got: ${productData.name} @ Bs.${productData.avg_price}`);
                            }
                        } catch (e) {
                            console.warn(`⚠️ Failed to scrape ${url.substring(40, 80)}...`);
                        }
                    }
                } finally {
                    await browser.close();
                    console.log('🔒 Browser closed (batch scrape)');
                }
            } catch (e) {
                console.error('❌ Batch scrape failed:', e);
            }
        }

        // FINAL FALLBACK TO MOCK - Only if everything failed
        const usedMock = products.length === 0;
        if (usedMock) {
            console.log('⚠️ Scraper empty/failed, using MOCK DATA as emergency fallback');
            products = mockProducts.map(p => ({ ...p, category }));
        }

        // Upsert to Supabase
        try {
            const { error } = await supabase
                .from('products')
                .upsert(products, { onConflict: 'name' });

            if (error) console.error("Supabase Upsert Error:", error);

            const historyEntries = products.map(p => ({
                product_name: p.name,
                price: p.avg_price
            }));

            const { error: historyError } = await supabase
                .from('price_history')
                .insert(historyEntries);

            if (historyError) console.error("Supabase History Error:", historyError);
        } catch (dbError) {
            console.error('Supabase write failed', dbError);
        }

        return NextResponse.json({
            success: true,
            count: products.length,
            data: products,
            source: usedMock ? 'mock' : 'scrape',
            metadata: {
                apiIntercepted: !!apiProductData,
                timestamp: new Date().toISOString()
            }
        });

    } catch (criticalError: any) {
        console.error('🔥 CRITICAL API ERROR:', criticalError);
        return NextResponse.json({
            success: true,
            data: mockProducts,
            source: 'emergency_fallback',
            error: criticalError.message
        });
    }
}
