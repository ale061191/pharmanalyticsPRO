
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cheerio = require('cheerio');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const filePath = path.join(__dirname, 'firecrawl_raw.html');
    if (!fs.existsSync(filePath)) {
        console.error("❌ No encuentro firecrawl_raw.html");
        return;
    }

    console.log("📂 Leyendo HTML...");
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // Estrategia mejorada: Normalización "Agresiva" y Match en Memoria

    // 1. Traer TODOS los productos de la categoría de BD
    const { data: dbProducts, error } = await supabase
        .from('products')
        .select('id, name, image_url')
        .eq('category', 'Salud Respiratoria');

    if (error) {
        console.error("❌ Error trayendo productos:", error);
        return;
    }
    console.log(`📦 Productos en BD: ${dbProducts.length}`);

    // Función de normalización
    const normalize = (str) => {
        if (!str) return '';
        return str.toLowerCase()
            .replace(/[^a-z0-9ñáéíóúü]/g, ' ') // Reemplazar NO alfanuméricos por espacio
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Mapa de normalizado -> producto original
    const dbMap = new Map();
    dbProducts.forEach(p => {
        dbMap.set(normalize(p.name), p);
    });

    const productCards = $('app-product-card');
    console.log(`🔎 Tarjetas en HTML: ${productCards.length}`);

    let updates = 0;
    let matchesFound = 0;

    for (let i = 0; i < productCards.length; i++) {
        const el = productCards[i];
        const $el = $(el);

        let name = $el.find('.product-card__title').text().trim();
        const linkEl = $el.find('a.product-card__info-link');
        const href = linkEl.attr('href');
        let imgEl = $el.find('img.product-image__image');
        let imgSrc = imgEl.attr('src');
        if (!imgSrc || imgSrc.includes('base64')) {
            imgSrc = imgEl.attr('data-src') || imgSrc;
        }

        if (!name || !imgSrc || !href) continue;

        const productUrl = href.startsWith('http') ? href : `https://www.farmatodo.com.ve${href}`;
        const normalizedHtmlName = normalize(name);

        // 2. Buscar match Iterativo (Fuzzy)
        let matchedProduct = null;

        // Intento 1: Match Exacto
        if (dbMap.has(normalizedHtmlName)) {
            matchedProduct = dbMap.get(normalizedHtmlName);
        } else {
            // Intento 2: Substring Match Bidireccional
            const dbKeys = Array.from(dbMap.keys());
            for (const dbKey of dbKeys) {
                // Validación de longitud mínima
                if (dbKey.length < 5) continue;

                if (normalizedHtmlName.includes(dbKey) || dbKey.includes(normalizedHtmlName)) {
                    matchedProduct = dbMap.get(dbKey);
                    // console.log(`🔗 [Fuzzy Match] "${normalizedHtmlName}" <--> "${dbKey}"`);
                    break;
                }
            }
        }

        if (matchedProduct) {
            matchesFound++;
            if (!matchedProduct.image_url || matchedProduct.image_url !== imgSrc) {
                await supabase.from('products').update({
                    image_url: imgSrc,
                    url: productUrl,
                    updated_at: new Date()
                }).eq('id', matchedProduct.id);
                console.log(`✅ [Actualizado] ${name.substring(0, 30)}...`);
                updates++;
            } else {
                // console.log(`👌 [SKIP] ${name.substring(0,30)}... (ya tiene img)`);
            }
        } else {
            // console.log(`⚠️ [NO MATCH] HTML: "${normalizedHtmlName}"`);
        }
    }

    console.log(`🏁 Resumen: ${matchesFound} encontrados de ${dbProducts.length}. ${updates} actualizados.`);
}

main();
