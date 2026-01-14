const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const TARGET_URL = 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/salud-respiratoria-y-gripe?pag=1';

async function main() {
    console.log('🚀 Debugging Image Attributes...');
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        // Scroll a bit
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(r => setTimeout(r, 2000));

        const debugData = await page.evaluate(() => {
            const card = document.querySelector('div[class*="ProductCard"], div[class*="product-card"]');
            if (!card) return 'No card found';

            const img = card.querySelector('img');
            return {
                cardHtml: card.innerHTML,
                imgOuterHtml: img ? img.outerHTML : 'No img tag',
                imgAttributes: img ? Array.from(img.attributes).reduce((acc, attr) => ({ ...acc, [attr.name]: attr.value }), {}) : {}
            };
        });

        console.log('🔍 DATA:', JSON.stringify(debugData, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}
main();
