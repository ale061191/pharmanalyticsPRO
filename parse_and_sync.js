require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("📂 Leyendo firecrawl_raw.html...");

    let html = '';
    try {
        html = fs.readFileSync('firecrawl_raw.html', 'utf-8');
    } catch (e) {
        console.error("❌ No se encontró firecrawl_raw.html");
        return;
    }

    const $ = cheerio.load(html);
    const productCards = $('app-product-card');
    console.log(`🔎 Encontradas ${productCards.length} tarjetas de producto.`);

    let extractedProducts = [];

    // Parseo
    productCards.each((i, el) => {
        const $el = $(el);

        // 1. Nombre
        let name = $el.find('.product-card__title').text().trim();
        name = name.replace(/\s+/g, ' ').trim();

        // 2. Link
        const linkEl = $el.find('a.product-card__info-link');
        const href = linkEl.attr('href');
        if (!href) return; // Skip invalid
        const productUrl = href.startsWith('http') ? href : `https://www.farmatodo.com.ve${href}`;

        // 3. Imagen
        let imgEl = $el.find('img.product-image__image');
        let imgSrc = imgEl.attr('src');
        if (!imgSrc || imgSrc.includes('base64')) {
            imgSrc = imgEl.attr('data-src') || imgSrc;
        }

        // 4. Precio
        let priceRaw = $el.find('.text-price').text().trim();
        if (!priceRaw) {
            priceRaw = $el.text().match(/Bs\.\s?[\d\.,]+/)?.[0] || '';
        }

        // Limpieza precio
        let price = 0;
        if (priceRaw) {
            let clean = priceRaw.replace(/[Bs\.\s]/g, '').replace(',', '.');
            price = parseFloat(clean);
        }

        if (name && productUrl) {
            extractedProducts.push({
                name,
                url: productUrl,
                image_url: imgSrc,
                price,
                category: 'Salud Respiratoria'
            });
        }
    });

    console.log(`✅ Extraídos ${extractedProducts.length} productos estructurados.`);

    // Estrategia mejorada: UPSERT global usando 'name' como clave única.
    console.log(`🚀 Iniciando UPSERT masivo...`);

    let processedCount = 0;

    for (const p of extractedProducts) {
        // Objeto base para upsert
        const productData = {
            name: p.name,
            url: p.url,
            image_url: p.image_url,
            avg_price: p.price,
            category: 'Salud Respiratoria',
            updated_at: new Date()
        };

        // Upsert
        const { error } = await supabase
            .from('products')
            .upsert(productData, { onConflict: 'name' });

        if (error) {
            console.log(`❌ Error upserting ${p.name}:`, error.message);
        } else {
            processedCount++;
        }
    }

    console.log(`🏁 Sync terminado: ${processedCount} procesados (insertados/actualizados).`);
}

main();
