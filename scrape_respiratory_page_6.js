const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// Base URL for the category
const BASE_URL = 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/salud-respiratoria-y-gripe?pag=';

async function extractProducts(page) {
    return await page.evaluate(() => {
        const products = [];
        const seen = new Set();
        const cards = document.querySelectorAll('div[class*="ProductCard"], div[class*="product-card"], a[class*="product-link"]');

        cards.forEach(card => {
            try {
                // Link & URL
                const link = card.querySelector('a') || card.closest('a');
                const href = link?.getAttribute('href');
                if (!href || seen.has(href)) return;
                seen.add(href);
                const url = href.startsWith('http') ? href : `https://www.farmatodo.com.ve${href}`;

                // Text Content
                const text = card.innerText || '';

                // Name Extraction
                let name = '';
                const nameEl = card.querySelector('div[class*="text-title"], p[class*="text-title"], div[class*="product-name"]');
                if (nameEl) name = nameEl.innerText.trim();
                // Fallback name extraction
                if (!name) name = text.split('\n').filter(l => l.length > 5 && !l.includes('%'))[0];

                // Sanity Check for Name - Exclude discount labels and promos
                if (!name || name.length < 3 || name.match(/^\d+%$/) || name.includes('dto.') || name.includes('¡Aprovecha!') || name.includes('Oferta')) return;

                // Price Extraction
                let price = null;
                let originalPrice = null;
                const priceMatches = text.match(/Bs\.?\s*([\d.,]+)/g) || [];
                const prices = priceMatches.map(m => parseFloat(m.replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.'))).filter(p => !isNaN(p) && p > 0);

                if (prices.length > 0) {
                    prices.sort((a, b) => a - b);
                    price = prices[0];
                    if (prices.length > 1 && prices[prices.length - 1] > price) {
                        originalPrice = prices[prices.length - 1];
                    }
                }
                if (!price) return; // Skip if no price

                // Discount
                let discount = 0;
                if (originalPrice && price < originalPrice) {
                    discount = Math.round(((originalPrice - price) / originalPrice) * 100);
                }

                // Lab Extraction
                let lab = null;
                const commonLabs = ['Genven', 'Calox', 'La Santé', 'Leti', 'Oftalmi', 'Cofasa', 'Bayer', 'Vargas', 'Genfar', 'McK', 'Vivax', 'Siegfried'];
                for (const l of commonLabs) {
                    if (name.includes(l) || text.includes(l)) {
                        lab = l;
                        break;
                    }
                }

                // Image Extraction - FIXED (Filter out Add to Cart icons)
                const imgs = Array.from(card.querySelectorAll('img'));
                const productImg = imgs.find(i => {
                    const src = i.src || i.dataset?.src || '';
                    return !src.includes('icon-plus') && !src.includes('sdf-icon') && !i.classList.contains('icon-plus');
                });

                let imageUrl = null;
                if (productImg) {
                    if (productImg.dataset?.src) imageUrl = productImg.dataset.src;
                    else if (productImg.srcset) imageUrl = productImg.srcset.split(',')[0].split(' ')[0];
                    else if (productImg.src && !productImg.src.includes('data:image')) imageUrl = productImg.src;
                }

                // Fix headers/protocol
                if (imageUrl && !imageUrl.startsWith('http')) imageUrl = `https:${imageUrl}`;

                // Final check: if it's still the SVG, set to null
                if (imageUrl && imageUrl.includes('sdf-icon-plus')) imageUrl = null;

                products.push({ name, price, originalPrice, discount, lab, url, imageUrl, category: 'Salud Respiratoria y Gripe' });
            } catch (err) { }
        });
        return products;
    });
}

async function main() {
    console.log('🚀 Starting Deep Scrape: Salud Respiratoria (Fixed Images V2)...');

    // Credentials
    let SUPABASE_URL = '', SUPABASE_KEY = '';
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
        const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
        if (urlMatch) SUPABASE_URL = urlMatch[1].trim();
        if (keyMatch) SUPABASE_KEY = keyMatch[1].trim();
    } catch (e) { }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    let pageNum = 1;
    let totalSaved = 0;
    let consecutiveEmptyPages = 0;

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        while (true) {
            const url = `${BASE_URL}${pageNum}`;
            console.log(`\n📄 Scraping Page ${pageNum}...`);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Robust Scroll
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 400;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight) {
                            window.scrollBy(0, -100);
                            window.scrollBy(0, 100);
                            clearInterval(timer);
                            resolve();
                        }
                    }, 150);
                });
            });
            await new Promise(r => setTimeout(r, 4000));

            const products = await extractProducts(page);
            console.log(`📦 Found ${products.length} valid products.`);

            // Count images
            const withImages = products.filter(p => p.imageUrl).length;
            console.log(`   📸 Products with valid images: ${withImages}/${products.length}`);

            if (products.length === 0) {
                console.log('⚠️ Page likely empty.');
                consecutiveEmptyPages++;
                if (consecutiveEmptyPages >= 2) break;
            } else {
                consecutiveEmptyPages = 0;
                let savedCount = 0;
                for (const p of products) {
                    // Update image explicitly even if exists
                    const { error } = await supabase.from('products').upsert({
                        name: p.name,
                        avg_price: p.price,
                        original_price: p.originalPrice,
                        discount_percent: p.discount,
                        has_promotion: p.discount > 0,
                        lab_name: p.lab,
                        category: p.category,
                        image_url: p.imageUrl,
                        url: p.url
                    }, { onConflict: 'name' });
                    if (!error) savedCount++;
                }
                console.log(`💾 Saved ${savedCount} products to DB.`);
                totalSaved += savedCount;
            }
            pageNum++;
        }
        console.log(`\n🎉 TOTAL SAVED: ${totalSaved}`);
    } catch (error) {
        console.error('🔥 Error:', error);
    } finally {
        await browser.close();
    }
}
main();
