
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const url = "https://farmatodo.com.ve/producto/116389556-distronad-400mg-30capsulas-nad-nmn-resveratrol-astaxantina-distrilab";

    console.log(`Navigating to ${url}...`);
    // Use domcontentloaded for faster/safer load
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log('Page DOM loaded. Waiting 10s for hydration...');
    await new Promise(r => setTimeout(r, 10000));

    // Screenshot
    await page.screenshot({ path: 'debug_page.png', fullPage: true });
    console.log('Screenshot saved to debug_page.png');

    // Get all text
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Page Text Length:', text.length);

    if (text.includes("ATC") || text.includes("Principio activo")) {
        console.log("FOUND Vademecum data keywords!");
    } else {
        console.log("WARNING: Did NOT find 'ATC' or 'Principio activo' keys.");
    }

    // Dump HTML
    const html = await page.content();
    fs.writeFileSync('debug_puppeteer_dump_v2.html', html);
    console.log('Saved HTML to debug_puppeteer_dump_v2.html');

    await browser.close();
    process.exit(0);
})();
