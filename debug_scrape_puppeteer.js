
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

(async () => {
    const browser = await puppeteer.launch({ headless: true }); // headless: true for speed
    const page = await browser.newPage();
    const url = "https://farmatodo.com.ve/producto/116389556-distronad-400mg-30capsulas-nad-nmn-resveratrol-astaxantina-distrilab";

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Page loaded. Waiting a bit for dynamic content...');
    await new Promise(r => setTimeout(r, 5000));

    // Get all text
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Page Text Length:', text.length);

    // Check for ATC
    if (text.includes("ATC")) {
        console.log("FOUND 'ATC' in text!");
    } else {
        console.log("Did NOT find 'ATC' in text.");
    }

    // Dump HTML
    const html = await page.content();
    fs.writeFileSync('debug_puppeteer_dump.html', html);
    console.log('Saved rendered HTML to debug_puppeteer_dump.html');

    await browser.close();
})();
