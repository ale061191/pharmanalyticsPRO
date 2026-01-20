const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
    console.log('🕵️  Starting network interception spy...');

    const browser = await puppeteer.launch({
        headless: "new", // or false to see it
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=site-per-process']
    });

    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);

    page.on('request', request => {
        const url = request.url();

        // We look for Algolia queries
        if (url.includes('algolia') || url.includes('queries') || url.includes('search')) {
            const postData = request.postData();
            if (postData) {
                console.log(`\n🎯 CAPTURED REQUEST to: ${url}`);
                // Write to file immediately to avoid encoding/terminal issues
                require('fs').writeFileSync('master/intercepted_payload.json', postData);
                console.log('💾 Saved payload to master/intercepted_payload.json');

                // Try to parse identifying info
                try {
                    const json = JSON.parse(postData);
                    if (json.requests) {
                        json.requests.forEach((req, i) => {
                            console.log(`   🔸 Index Name [${i}]: ${req.indexName}`);
                            console.log(`   🔸 Params [${i}]: ${req.params}`);
                        });
                    }
                } catch (e) { }
            }
        }
        request.continue();
    });

    try {
        const targetURL = 'https://www.farmatodo.com.ve/buscar?product=Acetaminofen';
        console.log(`🚀 Navigating to: ${targetURL}`);

        // Go to page and wait for network idle to ensure calls verify
        await page.goto(targetURL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('⏳ Waiting a bit for dynamic loader...');
        await new Promise(r => setTimeout(r, 5000));

        console.log('📸 Taking debug screenshot...');
        await page.screenshot({ path: 'interception_debug.png', fullPage: true });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
        console.log('👋 Closed.');
    }
})();
