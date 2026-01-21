/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICH ATC DATA - WHO
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Enriches products in Supabase with ATC codes and standardized Active Ingredients.
 * Sources: WHO ATC/DDD Index (https://atcddd.fhi.no/)
 * 
 * LOGIC:
 *  1. Fetch products marked as 'Farmacia'/'Medicamentos' with missing ATC codes.
 *  2. Clean product names using Regex to identify likely Active Ingredient.
 *  3. Query WHO ATC Index.
 *  4. Update Supabase with ATC Code.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
    batchSize: 50,
    delayBetweenRequests: 1000,
    logFile: path.join(__dirname, 'atc_enrichment.log')
};

const args = process.argv.slice(2);
const LIMIT_ARG = args.indexOf('--limit');
const LIMIT = LIMIT_ARG !== -1 ? parseInt(args[LIMIT_ARG + 1]) : 100;

// Initialize Supabase
const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.key);

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}`;
    console.log(line);
    try {
        fs.appendFileSync(CONFIG.logFile, line + '\n');
    } catch (e) { }
}

const CLEANING_REGEX = [
    /\d+(\.|,)?\d*\s?(mg|ml|gr|g|mcg|ui|iu|%)/gi, // Units with decimals
    /\b(tabletas|capsulas|solucion|jarabe|inyectable|suspension|crema|unguento|comprimidos|gotas|ampollas|gel|locion|ovulos|supositorios|polvo|granulado|jabon|champu|acondicionador|barra|spray|aerosol)\b/gi, // Comprehensive Forms
    /\b(caja|fco|frasco|tubo|blister|sobre|x\d+|x\s?\d+|unidad|unidades|roll)\b/gi, // Packaging
    /[()\[\]]/g, // Parentheses
    /\s+/g, // Extra spaces
    /formula magistral/gi,
    /\b(genfar|calox|leti|behrens|abbott|bayer|pfizer|mck|vivax|genven|la sante|sante|sa|ag|novamed|farma|cofasa|kimiceg)\b/gi // Labs
];

function extractPotentialIngredient(productName, existingIngredient) {
    let source = existingIngredient && existingIngredient.length > 2 ? existingIngredient : productName;

    // 1. First pass cleaning
    let clean = source;
    CLEANING_REGEX.forEach(rx => {
        clean = clean.replace(rx, ' ');
    });

    // 2. Remove single characters and trim
    clean = clean.replace(/\b\w\b/g, '').replace(/\s+/g, ' ').trim();

    // 3. Heuristics
    // If we have "Acetaminofen Cafeina", take the first word usually, or try the whole thing?
    // WHO ATC search handles "Acetaminofen" better than "Acetaminofen Cafeina" usually.
    // Let's take the first two meaningful words max.
    const words = clean.split(' ').filter(w => w.length > 2);

    if (words.length > 0) {
        // Return first word if it looks like a chemical (no numbers)
        if (!words[0].match(/\d/)) return words[0];
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchWhoAtc(ingredient) {
    if (!ingredient) return null;

    try {
        // Search
        const url = `https://atcddd.fhi.no/atc_ddd_index/?code=&name=${encodeURIComponent(ingredient)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        const $ = cheerio.load(data);

        let result = null;

        // Iterate rows
        $('table tr').each((j, row) => {
            if (result) return;
            if (j === 0) return; // Header

            const cols = $(row).find('td');
            if (cols.length >= 2) {
                const atc = $(cols[0]).text().trim();
                const name = $(cols[1]).text().trim();

                // Loose match: if result name contains our search term or vice versa
                if (atc && name) {
                    if (name.toLowerCase().includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(name.toLowerCase())) {
                        result = { atc_code: atc, active_ingredient: name };
                        return false;
                    }
                }
            }
        });

        return result;

    } catch (e) {
        log(`   ❌ WHO Error (${ingredient}): ${e.message}`);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    log('🚀 Starting ATC Enrichment Process...');

    // 1. Fetch Products
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, active_ingredient')
        .is('atc_code', null)
        .or('department.eq.Farmacia,department.eq.Medicamentos') // Stricter filter
        .limit(LIMIT);

    if (error) {
        log(`❌ Database Error: ${error.message}`);
        process.exit(1);
    }

    log(`🔍 Found ${products.length} products to analyze.`);

    let updatedCount = 0;

    for (const p of products) {
        // 2. Identify Ingredient
        const searchCtx = extractPotentialIngredient(p.name, p.active_ingredient);

        if (!searchCtx || searchCtx.length < 3) {
            log(`   ⚠️ Skipping "${p.name}" - Parsed: "${searchCtx}" (Too short/Null)`);
            continue;
        }

        process.stdout.write(`   Processing: ${p.id.substring(0, 8)} | Clean: "${searchCtx}" `);

        // 3. Scrape
        const atcData = await fetchWhoAtc(searchCtx);

        if (atcData) {
            console.log(`✅ ATC: ${atcData.atc_code}`);
            log(`   ✅ Match: ${searchCtx} -> ${atcData.atc_code} (${atcData.active_ingredient})`);

            // 4. Update
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    atc_code: atcData.atc_code,
                    active_ingredient_standardized: atcData.active_ingredient
                })
                .eq('id', p.id);

            if (!updateError) updatedCount++;
        } else {
            console.log(`❌ No Match`);
            log(`   ❌ No Match for: "${searchCtx}" (Orig: ${p.name})`);
        }

        // Random delay
        await new Promise(r => setTimeout(r, CONFIG.delayBetweenRequests));
    }

    log(`\n🏁 Finished. Updated ${updatedCount} products.`);
}
