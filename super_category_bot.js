/**
 * 🦾 SUPER CATEGORY BOT - Farmatodo Scraper por Categorías
 * Versión: 2.0 (Fixed Images, Loop Pagination, Robust Scroll)
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// ============ CONFIGURACIÓN ============
const CONFIG = {
    // Intentar leer de .env.local si process.env falla (común en scripts locales)
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    headless: "new",
    timeout: 60000,
    categories: [
        { name: 'Salud Respiratoria y Gripe', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/salud-respiratoria-y-gripe' },
        { name: 'Dolor General', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/dolor-general' },
        { name: 'Salud Digestiva', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/salud-digestiva' },
        { name: 'Vitaminas y Productos Naturales', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/vitaminas-y-productos-naturales' },
        { name: 'Medicamentos', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/medicamentos' },
        { name: 'Dermatológicos', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/dermatologicos' },
        { name: 'Nutrición y Vida Saludable', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/nutricion-y-vida-saludable' },
        { name: 'Botiquín y Primeros Auxilios', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/botiquin-y-primeros-auxilios' },
        { name: 'Cuidado de la Vista', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/cuidado-de-la-vista' },
        { name: 'Cuidado de los Pies', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/cuidado-de-los-pies' },
        { name: 'Rehabilitación y Equipos Médicos', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/rehabilitacion-y-equipos-medicos' },
        { name: 'Incontinencia', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/incontinencia' },
        { name: 'Fórmulas Magistrales', url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/formulas-magistrales' },
    ]
};

// Cargar credenciales manualmente si falla process.env
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    if (!CONFIG.supabaseUrl) CONFIG.supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
    if (!CONFIG.supabaseKey) CONFIG.supabaseKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();
} catch (e) { }

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

async function extractProducts(page, categoryName) {
    return await page.evaluate((catName) => {
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
                if (!name) name = text.split('\n').filter(l => l.length > 5 && !l.includes('%'))[0];

                // Sanity Check
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
                if (!price) return;

                // Discount
                let discount = 0;
                if (originalPrice && price < originalPrice) {
                    discount = Math.round(((originalPrice - price) / originalPrice) * 100);
                }

                // Lab Extraction
                let lab = null;
                const commonLabs = ['Genven', 'Calox', 'La Santé', 'Leti', 'Oftalmi', 'Cofasa', 'Bayer', 'Vargas', 'Genfar', 'McK', 'Vivax', 'Siegfried', 'McKesson'];
                for (const l of commonLabs) {
                    if (name.includes(l) || text.includes(l)) {
                        lab = l;
                        break;
                    }
                }

                // Rating & Reviews Extraction
                let rating = null;
                let review_count = 0;
                // Try to find rating stars or text (Fallback attempts)
                // Note: Farmatodo often does not show ratings on listing cards, only details. 
                // We check if it exists hidden or in a specific element.
                const ratingEl = card.querySelector('div[class*="rating"], span[class*="rating"], div[class*="starts"]');
                if (ratingEl) {
                    // Try to parse "4.5" or similar from text or aria-label
                    const ratingText = ratingEl.getAttribute('aria-label') || ratingEl.innerText;
                    const rMatch = ratingText.match(/([\d.]+)/);
                    if (rMatch) rating = parseFloat(rMatch[1]);

                    // Check for count
                    const countMatch = ratingText.match(/\((\d+)\)/); // e.g. (150)
                    if (countMatch) review_count = parseInt(countMatch[1]);
                }

                // Image Extraction - Filter Icon-Plus
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
                if (imageUrl && !imageUrl.startsWith('http')) imageUrl = `https:${imageUrl}`;
                if (imageUrl && imageUrl.includes('sdf-icon-plus')) imageUrl = null;

                products.push({ name, price, originalPrice, discount, lab, url, imageUrl, rating, review_count, category: catName });
            } catch (err) { }
        });
        return products;
    }, categoryName);
}

async function scrapeCategory(page, category) {
    console.log(`\n📁 SCAPING CATEGORY: ${category.name}`);
    let pageNum = 1;
    let totalSaved = 0;
    let consecutiveEmptyPages = 0;

    const categorySeenUrls = new Set();
    let consecutiveDuplicatePages = 0;

    while (true) {
        const url = `${category.url}?pag=${pageNum}`;
        console.log(`   📄 Page ${pageNum}...`);

        try {
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
            await new Promise(r => setTimeout(r, 4000)); // Wait for lazy load

            const products = await extractProducts(page, category.name);

            if (products.length === 0) {
                consecutiveEmptyPages++;
                if (consecutiveEmptyPages >= 2) {
                    console.log('   🛑 Done (2 empty pages).');
                    break;
                }
            } else {
                consecutiveEmptyPages = 0;

                // CHECK FOR DUPLICATES (Pagination Loop Detection)
                let newProductsInBatch = 0;
                for (const p of products) {
                    if (!categorySeenUrls.has(p.url)) {
                        categorySeenUrls.add(p.url);
                        newProductsInBatch++;
                    }
                }

                if (newProductsInBatch === 0 && pageNum > 1) {
                    console.log('   🛑 Detected duplicate page (Pagination Loop). Stopping category.');
                    break;
                }

                let savedCount = 0;
                for (const p of products) {
                    const { error } = await supabase.from('products').upsert({
                        name: p.name,
                        avg_price: p.price,
                        original_price: p.originalPrice,
                        discount_percent: p.discount,
                        has_promotion: p.discount > 0,
                        lab_name: p.lab,
                        category: p.category,
                        image_url: p.imageUrl,
                        url: p.url,
                        rating: p.rating,
                        review_count: p.review_count,
                        updated_at: new Date()
                    }, { onConflict: 'name' });
                    if (!error) savedCount++;
                }
                console.log(`      ✓ Saved ${savedCount} products (${products.length} found, ${newProductsInBatch} new).`);
                totalSaved += savedCount;
            }
        } catch (e) {
            console.log(`   ❌ Error on page ${pageNum}: ${e.message}`);
        }
        pageNum++;
    }
    return totalSaved;
}

async function main() {
    console.log('🚀 INITIALIZING SUPER CATEGORY BOT 2.0...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        for (const cat of CONFIG.categories) {
            await scrapeCategory(page, cat);
        }

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        await browser.close();
    }
}
main();
