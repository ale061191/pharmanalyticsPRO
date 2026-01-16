require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSync() {
    console.log(`\n🧪 Testing Sync on firecrawl_raw.html`);
    const html = fs.readFileSync('firecrawl_raw.html', 'utf-8');
    const $ = cheerio.load(html);

    // Selectors match sync_batch.js
    const productCards = $('app-product-card');
    console.log(`🔎 Found ${productCards.length} cards.`);

    let products = [];

    productCards.each((i, el) => {
        const $el = $(el);
        // Debug first card
        if (i === 0) console.log("First card HTML:", $el.html().substring(0, 200));

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
            priceRaw = $el.text().match(/Bs\.\s?[\d\.,]+/)?.[0] || '';
        }

        let price = 0;
        if (priceRaw) {
            let clean = priceRaw.replace(/[Bs\.\s]/g, '').replace(',', '.');
            price = parseFloat(clean);
        }

        if (name && productUrl) {
            products.push({
                name,
                url: productUrl,
                image_url: imgSrc,
                avg_price: price,
                category: 'TEST_CATEGORY',
                updated_at: new Date()
            });
        }
    });

    console.log(`✅ Extracted ${products.length} products.`);
    if (products.length > 0) {
        console.log("Sample Product:", products[0]);
        // Upsert one for test
        const { error } = await supabase
            .from('products')
            .upsert(products.slice(0, 5), { onConflict: 'name' });

        if (error) console.error("❌ DB Error:", error.message);
        else console.log("✅ DB Upsert Successful (Test 5 items)");
    }
}

testSync();
