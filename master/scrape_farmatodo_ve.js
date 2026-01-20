/**
 * Farmatodo Venezuela Direct Scraper
 * 
 * Este script hace scraping directo de farmatodo.com.ve para obtener
 * productos REALES de Venezuela con precios en bolívares.
 * 
 * Uso: node master/scrape_farmatodo_ve.js
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Categorías de medicamentos a scrapear
const MEDICATION_CATEGORIES = [
    'medicamentos',
    'salud',
    'vitaminas-y-suplementos',
    'dolor-y-fiebre',
    'gripe-y-tos',
    'digestivo',
    'antibioticos',
    'cardiovascular',
    'diabetes'
];

// Términos de búsqueda para medicamentos comunes
const SEARCH_TERMS = [
    'Losartán',
    'Acetaminofén',
    'Ibuprofeno',
    'Metformina',
    'Omeprazol',
    'Amoxicilina',
    'Atorvastatina',
    'Enalapril',
    'Vitamina',
    'Antigripal',
    'Aspirina',
    'Diclofenaco',
    'Clonazepam',
    'Loratadina',
    'Amlodipino'
];

async function scrapeProducts() {
    console.log('🚀 Iniciando scraper de Farmatodo Venezuela...\n');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();
    const allProducts = new Map();

    try {
        // Interceptar respuestas de Algolia
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('algolia') && url.includes('queries')) {
                try {
                    const json = await response.json();
                    if (json.results) {
                        for (const result of json.results) {
                            if (result.hits) {
                                for (const hit of result.hits) {
                                    if (hit.name && hit.offerPrice) {
                                        allProducts.set(hit.name, {
                                            name: cleanProductName(hit.name),
                                            originalName: hit.name,
                                            offerPrice: hit.offerPrice,
                                            fullPrice: hit.fullPrice || hit.offerPrice,
                                            category: hit.categories?.[0]?.name || 'Medicamentos',
                                            brand: hit.brand || extractBrand(hit.name),
                                            imageUrl: hit.images?.[0]?.url || null,
                                            sku: hit.sku || null
                                        });
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignorar errores de parsing
                }
            }
        });

        // Navegar a la página principal
        console.log('📍 Navegando a farmatodo.com.ve...');
        await page.goto('https://www.farmatodo.com.ve/', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        // Esperar a que cargue
        await page.waitForTimeout(3000);

        // Buscar cada término de medicamento
        for (const term of SEARCH_TERMS) {
            console.log(`🔍 Buscando: ${term}...`);

            try {
                // Navegar a la búsqueda
                await page.goto(`https://www.farmatodo.com.ve/buscar?product=${encodeURIComponent(term)}`, {
                    waitUntil: 'networkidle',
                    timeout: 30000
                });

                // Esperar a que carguen los productos
                await page.waitForTimeout(2000);

                // Scroll para cargar más productos
                for (let i = 0; i < 3; i++) {
                    await page.evaluate(() => window.scrollBy(0, 1000));
                    await page.waitForTimeout(1000);
                }

                console.log(`   ✓ Encontrados ${allProducts.size} productos totales`);

            } catch (error) {
                console.log(`   ⚠️ Error buscando ${term}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
    } finally {
        await browser.close();
    }

    console.log(`\n📦 Total productos capturados: ${allProducts.size}`);

    // Convertir a array
    const products = Array.from(allProducts.values());

    // Guardar en Supabase
    if (products.length > 0) {
        await saveToSupabase(products);
    }

    return products;
}

function cleanProductName(name) {
    if (!name) return 'Producto';
    return name
        .replace(/^[!\/]+\s*/, '')
        .replace(/^\*+\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractBrand(name) {
    // Marcas venezolanas comunes
    const brands = ['Calox', 'Vivax', 'Biotech', 'MK', 'Genfar', 'Pfizer', 'Sanofi', 'Bayer', 'Abbott'];
    for (const brand of brands) {
        if (name && name.toLowerCase().includes(brand.toLowerCase())) {
            return brand;
        }
    }
    return null;
}

async function saveToSupabase(products) {
    console.log('\n💾 Guardando productos en Supabase...');

    // Primero, limpiar productos existentes
    console.log('🗑️ Limpiando base de datos...');
    const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (deleteError) {
        console.error('Error limpiando BD:', deleteError.message);
    }

    // Preparar productos para inserción
    const productsToInsert = products.map(p => ({
        name: p.name,
        avg_price: p.offerPrice,
        original_price: p.fullPrice,
        category: p.category,
        lab_name: p.brand,
        image_url: p.imageUrl,
        url: `https://www.farmatodo.com.ve/buscar?product=${encodeURIComponent(p.originalName)}`,
        stock_count: 100, // Default
        rating: 4.5,
        review_count: 10
    }));

    // Insertar en lotes de 100
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);

        const { error } = await supabase
            .from('products')
            .insert(batch);

        if (error) {
            console.error(`Error insertando lote ${i}:`, error.message);
        } else {
            inserted += batch.length;
            console.log(`   ✓ Insertados ${inserted}/${productsToInsert.length}`);
        }
    }

    console.log(`\n✅ ${inserted} productos venezolanos guardados en Supabase`);
}

// Ejecutar
scrapeProducts()
    .then(products => {
        console.log('\n🎉 Scraping completado!');
        console.log(`   Total productos: ${products.length}`);
        if (products.length > 0) {
            console.log('\n📋 Ejemplos de productos capturados:');
            products.slice(0, 5).forEach(p => {
                console.log(`   - ${p.name}: Bs.${p.offerPrice} (${p.brand || 'Sin marca'})`);
            });
        }
    })
    .catch(console.error);
