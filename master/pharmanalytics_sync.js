/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *                    PHARMANALYTICS MASTER SYNC - VENEZUELA EDITION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Sincronización DEFINITIVA usando el índice oficial "products-venezuela".
 * 
 * DATA SOURCE TRUST: HIGH (1:1 with Official Website)
 * 
 * @version 2.0.0 "The Golden Key"
 * @date 2026-01-18
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
//                              CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    algolia: {
        appId: 'VCOJEYD2PO',
        apiKey: '869a91e98550dd668b8b1dc04bca9011',
        index: 'products-venezuela', // ✅ INDICE CORRECTO
        fallbackIndices: [] // No fallbacks needed, this IS the source
    },

    // Prefijos para búsqueda exhaustiva
    searchPrefixes: [
        '',
        ...'abcdefghijklmnopqrstuvwxyz'.split(''),
        ...'0123456789'.split('')
    ],

    hitsPerPage: 100,
    maxRetries: 5,
    retryDelayMs: 2000,
    rateLimitMs: 100
};

// Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// CLI Args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

// ═══════════════════════════════════════════════════════════════════════════════
//                              LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_FILE = path.join(__dirname, 'sync.log');

function log(level, message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}`;
    console.log(logLine);
    try { fs.appendFileSync(LOG_FILE, logLine + '\n'); } catch (e) { }
}

const logger = {
    info: (msg) => log('info', msg),
    warn: (msg) => log('warn', msg),
    error: (msg) => log('error', msg),
    success: (msg) => log('ok', msg)
};

// ═══════════════════════════════════════════════════════════════════════════════
//                         FUNCIONES DE LIMPIEZA
// ═══════════════════════════════════════════════════════════════════════════════

function cleanProductName(hit) {
    let name = hit.description || hit.mediaDescription;
    if (hit.detailDescription && hit.detailDescription.trim()) {
        name += ' ' + hit.detailDescription;
    }
    if (!name || name.trim().length < 2) return null;

    return name
        .replace(/^!!/g, '')
        .replace(/^\/\//g, '')
        .replace(/^Psi\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractLab(hit) {
    // En este índice, 'marca' suele ser el laboratorio o marca comercial correcto.
    return hit.marca || hit.supplier || 'Genérico';
}

function extractCategory(hit) {
    // Prioridad a 'categorie', luego 'departments'
    return hit.categorie || (hit.departments && hit.departments[0]) || 'Salud';
}

// ═══════════════════════════════════════════════════════════════════════════════
//                            ALGOLIA CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

async function algoliaSearch(indexName, query, page = 0, retries = CONFIG.maxRetries) {
    const url = `https://${CONFIG.algolia.appId}-dsn.algolia.net/1/indexes/${indexName}/query`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Algolia-Application-Id': CONFIG.algolia.appId,
                    'X-Algolia-API-Key': CONFIG.algolia.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    page: page,
                    hitsPerPage: CONFIG.hitsPerPage,
                    // NO FILTERS NEEDED - The index is already filtered for Vzla
                }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();

        } catch (error) {
            if (attempt === retries) throw error;
            const delay = CONFIG.retryDelayMs * Math.pow(2, attempt - 1);
            logger.warn(`Reintento ${attempt}/${retries} en ${delay}ms: ${error.message}`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                         SINCRONIZACIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function syncAllProducts() {
    const startTime = Date.now();
    logger.info('═'.repeat(60));
    logger.info('    PHARMANALYTICS SYNC v2 (VENEZUELA GOLDEN SOURCE)');
    logger.info('═'.repeat(60));

    if (!DRY_RUN) {
        logger.warn('⚠️  Limpiando base de datos (WIPE)...');
        await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const allProducts = new Map();
    let totalFetched = 0;

    for (const prefix of CONFIG.searchPrefixes) {
        let page = 0;
        while (true) {
            try {
                const result = await algoliaSearch(CONFIG.algolia.index, prefix, page);
                if (!result.hits || result.hits.length === 0) break;

                for (const hit of result.hits) {
                    const name = cleanProductName(hit);
                    if (name && !allProducts.has(name)) {
                        allProducts.set(name, hit);
                    }
                }

                totalFetched += result.hits.length;
                if (page >= (result.nbPages || 1) - 1) break;
                page++;
                await new Promise(r => setTimeout(r, CONFIG.rateLimitMs));
            } catch (e) {
                logger.error(`Error prefix "${prefix}": ${e.message}`);
                break;
            }
        }
        process.stdout.write('.'); // Progress dot
    }

    logger.success(`\n✅ Total recolectado: ${totalFetched} hits → ${allProducts.size} productos únicos`);

    // Procesar Datos (MAPEO CORRECTO)
    const processedProducts = [];
    for (const [name, hit] of allProducts) {

        // NO MÁS DIVISIONES ENTRE 100,000. EL ÍNDICE YA VIENE EN Bs.
        const price = parseFloat(hit.fullPrice || 0);
        const offerPrice = parseFloat(hit.offerPrice || 0);
        const finalPrice = offerPrice > 0 ? offerPrice : price;

        // Stock Logic
        const stockArray = hit.stores_with_stock || [];
        const isAvailable = stockArray.length > 0;

        processedProducts.push({
            id: hit.objectID || hit.id,
            name: name,
            brand: extractLab(hit),
            avg_price: finalPrice,
            original_price: finalPrice < price ? price : null,
            category: extractCategory(hit),
            image_url: hit.mediaImageUrl || null,
            // NEW FIELDS from ALGOLIA_DATA_GUIDE.md
            sales: hit.sales || 0, // 📈 Sales velocity for rankings
            barcode: hit.barcode || null, // Product EAN/UPC
            active_ingredient: hit.principioActivo || hit.activeIngredient || null,
            updated_at: new Date().toISOString()
        });
    }

    if (DRY_RUN) {
        logger.info('[DRY-RUN] Sample:');
        console.log(processedProducts.slice(0, 3));
        return;
    }

    // Upsert Batch
    logger.info(`Sincronizando ${processedProducts.length} productos...`);
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < processedProducts.length; i += batchSize) {
        const batch = processedProducts.slice(i, i + batchSize);
        const { error } = await supabase.from('products').upsert(batch, { onConflict: 'name' });

        if (error) {
            logger.error(`Batch error: ${error.message}`);
        } else {
            updated += batch.length;
        }

        if (i % 500 === 0) logger.info(`   Progreso: ${Math.round((i / processedProducts.length) * 100)}%`);
    }

    logger.success('✅ SINCRONIZACIÓN COMPLETADA CON ÉXITO');
    logger.info(`Total insertados/actualizados: ${updated}`);
}

syncAllProducts();
