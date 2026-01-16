/**
 * deep_scrape_batch.js
 * 
 * Fetches product URLs from Supabase and scrapes detailed branch-level stock
 * information from each Farmatodo product page.
 * 
 * Output: Inserts data into `stock_history` table.
 */

require('dotenv').config({ path: '.env.local' });
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// --- Configuration ---
const BATCH_SIZE = 10; // Process N products at a time
const DELAY_BETWEEN_BATCHES_MS = 2000; // Wait between batches to avoid rate limits
const MAX_RETRIES = 2;
const FIRECRAWL_TIMEOUT = 90000; // 90 seconds per page

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

if (!supabaseUrl || !supabaseKey || !firecrawlApiKey) {
    console.error("❌ Missing environment variables (Supabase or Firecrawl).");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Logging ---
const logFile = fs.createWriteStream('deep_scrape.log', { flags: 'a' });
function log(message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}`;
    console.log(line);
    logFile.write(line + '\n');
}

// --- Firecrawl Scrape ---
async function scrapeProductPage(url, retries = 0) {
    try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${firecrawlApiKey}`
            },
            body: JSON.stringify({
                url: url,
                formats: ['html'],
                waitFor: 5000, // Wait 5s for dynamic content
                timeout: FIRECRAWL_TIMEOUT
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Firecrawl API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.data || !data.data.html) {
            throw new Error("Empty HTML response from Firecrawl.");
        }
        return data.data.html;
    } catch (error) {
        if (retries < MAX_RETRIES) {
            log(`⚠️ Retry ${retries + 1}/${MAX_RETRIES} for ${url}: ${error.message}`);
            await sleep(3000); // Wait before retry
            return scrapeProductPage(url, retries + 1);
        }
        throw error;
    }
}

// --- Parser ---
function parseProductHtml(html, productName) {
    const $ = cheerio.load(html);
    const branches = [];

    // Strategy 1: Look for district/stock pairs using user-provided selectors
    const stockElements = $('.text-stock-district');
    const districtElements = $('.text-district strong');

    if (stockElements.length > 0) {
        stockElements.each((i, el) => {
            const stockText = $(el).text().trim();
            const stockMatch = stockText.match(/(\d+)/);
            const stockCount = stockMatch ? parseInt(stockMatch[1], 10) : 0;

            // Try to find corresponding district name
            let districtName = "Desconocido";
            if (districtElements.length > i) {
                districtName = $(districtElements[i]).text().trim();
            }

            branches.push({
                nombre: districtName,
                stock: stockCount,
                ciudad: inferCity(districtName) // Infer city from district name
            });
        });
    }

    // Strategy 2: Fallback - Look for common patterns if Strategy 1 fails
    if (branches.length === 0) {
        // Check for "Agotado" (Out of Stock) indicator
        const isOutOfStock = $('body').text().toLowerCase().includes('agotado') ||
            $('.stock-petal').length === 0;

        if (isOutOfStock) {
            log(`   ⚠️ Product appears out of stock: ${productName}`);
        }
        // Return empty branches, stock_count will be 0
    }

    const totalStock = branches.reduce((sum, b) => sum + b.stock, 0);

    return {
        producto: productName,
        total_stock: totalStock,
        sucursales: branches,
        disponible: totalStock > 0
    };
}

// --- City Inference (Expanded for Venezuela) ---
function inferCity(districtName) {
    const cityMap = {
        // Caracas metro area
        "caracas": "Caracas", "los chorros": "Caracas", "altamira": "Caracas",
        "chacao": "Caracas", "las mercedes": "Caracas", "el hatillo": "Caracas",
        "la castellana": "Caracas", "sabana grande": "Caracas", "plaza venezuela": "Caracas",
        "libertador": "Caracas", "baruta": "Caracas", "sucre": "Caracas",
        "petare": "Caracas", "el paraiso": "Caracas", "la candelaria": "Caracas",
        "sambil": "Caracas", "ccct": "Caracas", "santa fe": "Caracas",

        // Major cities
        "maracaibo": "Maracaibo", "valencia": "Valencia", "barquisimeto": "Barquisimeto",
        "maracay": "Maracay", "puerto la cruz": "Puerto La Cruz", "lecheria": "Lechería",
        "barcelona": "Barcelona", "ciudad bolivar": "Ciudad Bolívar", "maturin": "Maturín",
        "cumana": "Cumaná", "puerto ordaz": "Puerto Ordaz", "san cristobal": "San Cristóbal",
        "merida": "Mérida", "punto fijo": "Punto Fijo", "cabimas": "Cabimas",
        "los teques": "Los Teques", "guarenas": "Guarenas", "guatire": "Guatire",
        "coro": "Coro", "barinas": "Barinas", "acarigua": "Acarigua",
        "araure": "Araure", "san fernando": "San Fernando de Apure", "guanare": "Guanare",
        "tucupita": "Tucupita", "san juan": "San Juan de los Morros", "la victoria": "La Victoria",
        "cabudare": "Cabudare", "cua": "Cúa", "charallave": "Charallave",
        "ocumare": "Ocumare del Tuy", "porlamar": "Porlamar", "la asuncion": "La Asunción",
        "carora": "Carora", "el tigre": "El Tigre", "anaco": "Anaco",
        "valera": "Valera", "trujillo": "Trujillo", "ejido": "Ejido",
        "el vigia": "El Vigía", "san antonio": "San Antonio del Táchira", "rubio": "Rubio",
        "la grita": "La Grita", "santa barbara": "Santa Bárbara del Zulia", "machiques": "Machiques",
        "ciudad ojeda": "Ciudad Ojeda", "lagunillas": "Lagunillas", "bachaquero": "Bachaquero",
        "guacara": "Guacara", "san diego": "San Diego", "naguanagua": "Naguanagua",
        "los guayos": "Los Guayos", "tocuyito": "Tocuyito", "turmero": "Turmero",
        "cagua": "Cagua", "villa de cura": "Villa de Cura", "palo negro": "Palo Negro",
        "la morita": "La Morita", "catia la mar": "Catia La Mar", "naiguata": "Naiguatá",
        "higuerote": "Higuerote", "rio chico": "Río Chico", "caucagua": "Caucagua"
    };
    const lower = districtName.toLowerCase();
    for (const key in cityMap) {
        if (lower.includes(key)) return cityMap[key];
    }
    return "Otra";
}

// --- Database Insert ---
async function insertStockHistory(productName, branches) {
    if (branches.length === 0) return;

    const records = branches.map(b => ({
        product_name: productName,
        city: b.ciudad,
        stock_count: b.stock,
        scraped_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('stock_history').insert(records);
    if (error) {
        log(`   ❌ DB Insert Error for ${productName}: ${error.message}`);
    }
}

async function updateProductStock(productName, totalStock) {
    const { error } = await supabase
        .from('products')
        .update({ stock_count: totalStock })
        .eq('name', productName);

    if (error) {
        log(`   ❌ Product Update Error for ${productName}: ${error.message}`);
    }
}

// --- Utilities ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main Process ---
async function processProduct(product) {
    const { name, url } = product;
    log(`🔍 Processing: ${name}`);

    try {
        const html = await scrapeProductPage(url);
        const result = parseProductHtml(html, name);

        log(`   ✅ Stock: ${result.total_stock} | Branches: ${result.sucursales.length}`);

        // Insert into stock_history
        await insertStockHistory(name, result.sucursales);

        // Update main products table
        await updateProductStock(name, result.total_stock);

        return { success: true, product: name };
    } catch (error) {
        log(`   ❌ Failed: ${error.message}`);
        return { success: false, product: name, error: error.message };
    }
}

async function runBatchScrape() {
    log("\n========================================");
    log("🚀 Starting Deep Stock Batch Scrape");
    log("========================================\n");

    // Fetch all product URLs from Supabase
    const { data: products, error } = await supabase
        .from('products')
        .select('name, url')
        .not('url', 'is', null);

    if (error) {
        log(`❌ Failed to fetch products: ${error.message}`);
        process.exit(1);
    }

    log(`📦 Total products to process: ${products.length}`);

    let successCount = 0;
    let failCount = 0;

    // Process in batches
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1} (${i + 1} - ${i + batch.length}) ---`);

        // Process batch sequentially to avoid overwhelming Firecrawl
        for (const product of batch) {
            const result = await processProduct(product);
            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        // Delay between batches
        if (i + BATCH_SIZE < products.length) {
            log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch...`);
            await sleep(DELAY_BETWEEN_BATCHES_MS);
        }
    }

    log("\n========================================");
    log(`🏁 Scrape Complete!`);
    log(`   ✅ Success: ${successCount}`);
    log(`   ❌ Failed: ${failCount}`);
    log("========================================\n");

    logFile.end();
}

runBatchScrape();
