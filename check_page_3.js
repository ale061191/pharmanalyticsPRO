const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const TARGET_URL = 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/salud-respiratoria-y-gripe?pag=3';

async function main() {
    console.log('Checking Page 3...');
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
        const page = await browser.newPage();
        await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Scroll
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
        await new Promise(r => setTimeout(r, 2000));

        const count = await page.evaluate(() => {
            return document.querySelectorAll('div[class*="ProductCard"], div[class*="product-card"]').length;
        });

        console.log(`Page 3 has ${count} cards.`);
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}
main();
