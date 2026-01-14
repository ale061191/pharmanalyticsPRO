/**
 * Debug script to test Farmatodo product scraping
 * Run with: node scrape-farmatodo-test.js
 */
const puppeteer = require('puppeteer');

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

async function testScrape() {
    console.log('🚀 Starting Farmatodo scrape test...');

    const browser = await puppeteer.launch({
        headless: false, // Set to false to see the browser
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
        ]
    });

    try {
        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent(USER_AGENTS[0]);
        await page.setViewport({ width: 1920, height: 1080 });

        // Geolocation for Caracas
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://www.farmatodo.com.ve', ['geolocation']);
        await page.setGeolocation({ latitude: 10.4806, longitude: -66.9036, accuracy: 100 });

        // Capture all API responses
        const apiResponses = [];
        page.on('response', async (response) => {
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
                try {
                    const data = await response.json();
                    apiResponses.push({ url: url.substring(0, 100), keys: Object.keys(data), sample: JSON.stringify(data).substring(0, 200) });
                } catch (e) { }
            }
        });

        // Navigate to category page
        const categoryUrl = 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos';
        console.log(`📋 Navigating to: ${categoryUrl}`);

        await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        console.log('✅ Page loaded');

        // Wait a bit for JS to hydrate
        await new Promise(r => setTimeout(r, 5000));

        // Try multiple selector strategies
        const selectorResults = await page.evaluate(() => {
            const results = {};

            // Strategy 1: product-card
            results.productCards = document.querySelectorAll('.product-card').length;
            results.productCardContent = document.querySelectorAll('.product-card__content').length;

            // Strategy 2: data attributes
            results.dataProduct = document.querySelectorAll('[data-product]').length;
            results.dataItem = document.querySelectorAll('[data-item]').length;

            // Strategy 3: Links with product in href
            results.productLinks = document.querySelectorAll('a[href*="/producto/"]').length;

            // Strategy 4: Any card-like containers
            results.cards = document.querySelectorAll('[class*="card"]').length;

            // Strategy 5: Grid items
            results.gridItems = document.querySelectorAll('[class*="grid"] > *').length;

            // Get sample of links
            const links = Array.from(document.querySelectorAll('a[href*="/producto/"]')).slice(0, 5);
            results.sampleLinks = links.map(l => ({
                href: l.href,
                text: l.textContent?.trim().substring(0, 50)
            }));

            // Get all class names that contain "product"
            const allElements = Array.from(document.querySelectorAll('*'));
            const productClasses = new Set();
            allElements.forEach(el => {
                if (el.className && typeof el.className === 'string') {
                    el.className.split(' ').forEach(c => {
                        if (c.toLowerCase().includes('product')) {
                            productClasses.add(c);
                        }
                    });
                }
            });
            results.productClasses = Array.from(productClasses);

            return results;
        });

        console.log('\n📊 SELECTOR RESULTS:');
        console.log(JSON.stringify(selectorResults, null, 2));

        console.log('\n📦 API RESPONSES CAPTURED:');
        apiResponses.forEach(r => console.log(`  ${r.url} -> keys: ${r.keys.join(', ')}`));

        // Take a screenshot
        await page.screenshot({ path: 'farmatodo_category_test.png', fullPage: true });
        console.log('\n📸 Screenshot saved to farmatodo_category_test.png');

        // If we found product links, extract their data
        if (selectorResults.productLinks > 0) {
            const products = await page.evaluate(() => {
                const productElements = Array.from(document.querySelectorAll('a[href*="/producto/"]'));
                return productElements.slice(0, 10).map(el => {
                    const container = el.closest('[class*="card"]') || el.parentElement?.parentElement;
                    const name = container?.querySelector('p, h3, [class*="name"], [class*="title"]')?.textContent?.trim();
                    const priceEl = container?.querySelector('[class*="price"], span');
                    const price = priceEl?.textContent?.trim();
                    const img = container?.querySelector('img')?.src;
                    return { name, price, url: el.href, img };
                }).filter(p => p.name);
            });

            console.log('\n🛒 EXTRACTED PRODUCTS:');
            products.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} - ${p.price}`));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
        console.log('\n🔒 Browser closed');
    }
}

testScrape();
