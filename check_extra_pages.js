const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const BASE_URL = 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/salud-respiratoria-y-gripe?pag=';
const PAGES_TO_CHECK = [4, 5, 6];

async function main() {
    console.log('🚀 Checking Pages 4, 5, and 6...');

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        for (const pageNum of PAGES_TO_CHECK) {
            const url = `${BASE_URL}${pageNum}`;
            console.log(`\n📄 Checking Page ${pageNum}...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Scroll to load all content
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 300;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
            await new Promise(r => setTimeout(r, 3000)); // Wait for render

            const count = await page.evaluate(() => {
                return document.querySelectorAll('div[class*="ProductCard"], div[class*="product-card"], a[class*="product-link"]').length;
            });

            console.log(`📦 Page ${pageNum} Result: ${count} products found.`);

            if (count > 0) {
                // Optional: Log first product name to verify it's real content
                const firstName = await page.evaluate(() => {
                    const el = document.querySelector('div[class*="text-title"], p[class*="text-title"]');
                    return el ? el.innerText.trim() : 'Unknown';
                });
                console.log(`   First product: ${firstName}`);
            }
        }

    } catch (e) {
        console.error('🔥 Error:', e);
    } finally {
        await browser.close();
    }
}

main();
