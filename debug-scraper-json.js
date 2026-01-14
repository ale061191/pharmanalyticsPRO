const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Arrays to store captured data
    const capturedRequests = [];

    page.on('request', req => {
        // console.log('Request:', req.url());
    });

    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('api-transactional') || url.includes('stock') || url.includes('store') || url.includes('availability')) {
            try {
                if (response.headers()['content-type']?.includes('json')) {
                    const data = await response.json();
                    capturedRequests.push({
                        url,
                        data
                    });
                }
            } catch (e) { }
        }
    });

    try {
        console.log('Navigating to product page...');
        // Using a known product URL
        await page.goto('https://www.farmatodo.com.ve/producto/11090666-jeringa-5ml-21x1-1-2-nipro-ca-100-und', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log('Page loaded. Waiting a bit...');
        await new Promise(r => setTimeout(r, 5000));

        // Take screenshot
        console.log('Taking screenshot...');
        await page.screenshot({ path: 'page_preview.png', fullPage: true });

        // Extract potential buttons/links text
        const interactiveElements = await page.evaluate(() => {
            const getVisibility = (el) => {
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            };

            const buttons = Array.from(document.querySelectorAll('button'))
                .filter(getVisibility)
                .map(b => ({
                    tag: 'button',
                    text: b.innerText.trim(),
                    class: b.className,
                    id: b.id
                }));
            const links = Array.from(document.querySelectorAll('a'))
                .filter(getVisibility)
                .map(a => ({
                    tag: 'a',
                    text: a.innerText.trim(),
                    class: a.className,
                    href: a.href
                }));
            const spans = Array.from(document.querySelectorAll('span, div'))
                .filter(el => {
                    const text = el.innerText.trim();
                    return (text.includes('Consultar') || text.includes('Distonibilidad') || text.includes('Tiendas')) && getVisibility(el);
                })
                .map(d => ({
                    tag: d.tagName.toLowerCase(),
                    text: d.innerText.substring(0, 50).trim(),
                    class: d.className
                }));

            return [...buttons, ...links, ...spans];
        });

        fs.writeFileSync('page_elements.json', JSON.stringify(interactiveElements, null, 2));
        fs.writeFileSync('farmatodo_debug.json', JSON.stringify(capturedRequests, null, 2));

        console.log('Done. Check page_preview.png and page_elements.json');

    } catch (error) {
        console.error('Error:', error);
        // Take error screenshot
        await page.screenshot({ path: 'error_screenshot.png' });
    } finally {
        await browser.close();
    }
})();
