/**
 * Inspect selectors on Farmatodo page - quick script
 * Run with: node inspect_selectors.js
 */
const puppeteer = require('puppeteer');

async function inspectPage() {
    console.log('🔍 Inspecting Farmatodo selectors...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Navigate
        await page.goto('https://www.farmatodo.com.ve/categorias/salud-y-medicamentos', {
            waitUntil: 'networkidle2',
            timeout: 45000
        });

        // Wait for content
        await new Promise(r => setTimeout(r, 3000));

        // Inspect page structure
        const structure = await page.evaluate(() => {
            const results = {
                totalLinks: document.querySelectorAll('a').length,
                productLinks: document.querySelectorAll('a[href*="/producto/"]').length,
                allClassesWithCard: [],
                productContainers: []
            };

            // Find all class names containing "product"
            const allElements = Array.from(document.querySelectorAll('[class*="product"], [class*="card"], [class*="item"]'));
            allElements.forEach(el => {
                if (!results.allClassesWithCard.includes(el.className)) {
                    results.allClassesWithCard.push(el.className);
                }
            });

            // Try to find product containers by looking for elements with images and prices
            const candidates = Array.from(document.querySelectorAll('div, li, article')).filter(el => {
                const hasImg = el.querySelector('img') !== null;
                const hasPrice = el.textContent?.includes('Bs') || false;
                const hasLink = el.querySelector('a[href*="/producto/"]') !== null;
                return hasImg && hasPrice && hasLink;
            });

            results.foundCandidates = candidates.length;

            // Get sample from first candidate
            if (candidates.length > 0) {
                const sample = candidates[0];
                results.sampleOuterHTML = sample.outerHTML.substring(0, 500);
                results.sampleClasses = sample.className;
            }

            // Extract actual products
            results.extractedProducts = candidates.slice(0, 10).map(el => {
                const link = el.querySelector('a[href*="/producto/"]');
                const img = el.querySelector('img');
                const texts = Array.from(el.querySelectorAll('p, span, div')).map(t => t.textContent?.trim()).filter(t => t && t.length > 2);
                const priceText = texts.find(t => t?.includes('Bs'));
                const nameText = texts.find(t => t && !t.includes('Bs') && t.length > 5);

                return {
                    name: nameText || link?.textContent?.trim(),
                    price: priceText,
                    url: link?.href,
                    img: img?.src
                };
            }).filter(p => p.name);

            return results;
        });

        console.log('📊 Page Structure Analysis:');
        console.log(`   Total links: ${structure.totalLinks}`);
        console.log(`   Product links (/producto/): ${structure.productLinks}`);
        console.log(`   Candidate containers: ${structure.foundCandidates}`);

        if (structure.sampleClasses) {
            console.log(`\n📦 Sample container classes: ${structure.sampleClasses}`);
        }

        console.log('\n🛒 EXTRACTED PRODUCTS:');
        structure.extractedProducts.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.name?.substring(0, 50)}`);
            console.log(`      Price: ${p.price}`);
            console.log(`      URL: ${p.url?.substring(0, 60)}...`);
        });

        // Save results to JSON
        require('fs').writeFileSync('farmatodo_selectors.json', JSON.stringify(structure, null, 2));
        console.log('\n✅ Full results saved to farmatodo_selectors.json');

    } finally {
        await browser.close();
    }
}

inspectPage().catch(console.error);
