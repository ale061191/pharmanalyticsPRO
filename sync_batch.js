require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const categories = require('./categories');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase keys in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function processCategory(category) {
    const filename = path.join(__dirname, 'raw_html', `${category.slug}.html`);
    if (!fs.existsSync(filename)) {
        console.warn(`⚠️ File not found: ${filename} (Skipping)`);
        return;
    }

    console.log(`\n📂 Processing: ${category.name}`);
    const html = fs.readFileSync(filename, 'utf-8');
    const $ = cheerio.load(html);

    // Selectors based on parse_and_sync.js and debug findings
    const productCards = $('app-product-card');
    console.log(`🔎 Found ${productCards.length} cards.`);

    let products = [];

    productCards.each((i, el) => {
        const $el = $(el);

        let name = $el.find('.product-card__title').text().trim();
        name = name.replace(/\s+/g, ' ').trim();

        const linkEl = $el.find('a.product-card__info-link');
        const href = linkEl.attr('href');
        if (!href) return;

        const productUrl = href.startsWith('http') ? href : `https://www.farmatodo.com.ve${href}`;

        // Image
        let imgEl = $el.find('img.product-image__image');
        let imgSrc = imgEl.attr('src');
        if (!imgSrc || imgSrc.includes('base64')) {
            imgSrc = imgEl.attr('data-src') || imgSrc;
        }

        // Price
        let priceRaw = $el.find('.text-price').text().trim();
        if (!priceRaw) {
            // Fallback regex
            priceRaw = $el.text().match(/Bs\.\s?[\d\.,]+/)?.[0] || '';
        }

        let price = 0;
        if (priceRaw) {
            let clean = priceRaw.replace(/[Bs\.\s]/g, '').replace(',', '.');
            price = parseFloat(clean);
        }

        // Stock status (Optional, inferred)
        // If "Agotado" text is present or "Agregar" button is missing
        // For now, we assume if it's strictly distinct visually.
        // Let's rely on name/price first.
        // Stock Status Logic
        // If it has 'app-button__icon-plus', it is available (set arbitrary high stock, e.g. 100)
        // If it has 'product-card__subscribe-btn' or no button, it is out of stock (0)
        const hasAddButton = $el.find('button.app-button__icon-plus').length > 0;
        const stockCount = hasAddButton ? 100 : 0;

        if (name && productUrl) {
            products.push({
                name,
                url: productUrl,
                image_url: imgSrc,
                avg_price: price,
                category: category.name,
                stock_count: stockCount, // Update stock count based on availability
                scraped_at: new Date().toISOString()
            });
        }
    });

    if (products.length === 0) {
        console.log(`⚠️ No products extracted for ${category.name}`);
        return;
    }

    // Upsert batch
    // Supabase upsert limitation: handle batch manually or in chunks if large, 
    // but 120 items is fine.

    const { error } = await supabase
        .from('products')
        .upsert(products, { onConflict: 'name' });
    // Note: 'name' is unique constraint? Verify schema? 
    // parse_and_sync.js used { onConflict: 'name' }, so we assume it is.

    if (error) {
        console.error(`❌ DB Error for ${category.name}:`, error.message);
    } else {
        console.log(`✅ Synced ${products.length} products to DB.`);
    }
}

async function runSync() {
    for (const cat of categories) {
        await processCategory(cat);
    }
    console.log("\n🏁 All categories processed.");
}

runSync();
