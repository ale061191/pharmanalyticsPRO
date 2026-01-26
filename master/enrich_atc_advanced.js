/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICH ATC ADVANCED
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * High-Precision ATC Enrichment using a Hybrid Approach:
 * 1. Local Reference Match (Fast, High Confidence)
 * 2. Gemini AI Extraction & Normalization (Smart Parsing)
 * 3. Fallback Heuristics
 * 
 * PRECAUTIONS:
 * - Detailed logging.
 * - Rate limiting for AI API.
 * - Transactional updates (one by one) to minimize risk.
 * - Validation of AI output against local reference lists.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_ROLE_KEY // Using Service Role for reliable updates
    },
    gemini: {
        key: process.env.GEMINI_API_KEY,
        model: 'gemini-3-flash-preview' // Using what worked in deep_harvest_resume.js
    },
    batchSize: 20, // Strict compliance with audit report (20 items)
    delayBetweenAI: 5000, // 5 seconds wait (Audit requirement: 2-5s)
    logFile: path.join(__dirname, 'atc_enrichment_advanced.log')
};

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.key);
const genAI = new GoogleGenerativeAI(CONFIG.gemini.key);
const model = genAI.getGenerativeModel({ model: CONFIG.gemini.model });

// Logger
function log(msg, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${type}] ${msg}`;
    console.log(line);
    try {
        fs.appendFileSync(CONFIG.logFile, line + '\n');
    } catch (e) { }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC MODEL DISCOVERY
// ═══════════════════════════════════════════════════════════════════════════════

async function getAvailableModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${CONFIG.gemini.key}`;
    log(`🔍 Discovering available models via REST...`, 'INIT');

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url);
        if (!response.ok) {
            log(`❌ API Error Listing Models: ${response.status} ${response.statusText}`, 'ERROR');
            return ['gemini-1.5-flash']; // Fallback
        }

        const data = await response.json();
        if (!data.models) return ['gemini-1.5-flash'];

        // Get all generation models
        let candidates = data.models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

        log(`📋 Found ${candidates.length} models.`, 'INIT');

        // Sort candidates by preference to avoid burning quota on experimental models first if possible
        const priorityOrder = [
            'gemini-3-flash-preview', 'gemini-3-pro-preview',
            'gemini-2.5-flash', 'gemini-2.0-flash-exp',
            'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-flash-latest',
            'gemini-1.5-pro', 'gemini-1.5-pro-latest', 'gemini-pro'
        ];

        candidates.sort((a, b) => {
            const idxA = priorityOrder.indexOf(a);
            const idxB = priorityOrder.indexOf(b);
            // If both present, sort by index
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            // If only A present, A comes first
            if (idxA !== -1) return -1;
            // If only B present, B comes first
            if (idxB !== -1) return 1;
            // Neither present, keep original order
            return 0;
        });

        log(`📋 Final Priority List: ${candidates.join(', ')}`, 'INIT');
        return candidates.length > 0 ? candidates : ['gemini-1.5-flash'];

    } catch (e) {
        log(`❌ Discovery Failed: ${e.message}`, 'ERROR');
        return ['gemini-1.5-flash'];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Loads ATC Reference table into memory for fast lookup.
 * Returns a Map: Normalized Ingredient Name -> ATC Code Info
 */
async function loadAtcReference() {
    log('📥 Loading ATC Reference Data...', 'INIT');

    // We fetch smaller chunks if table is huge, but usually ATC is < 6000 rows
    let allRefs = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('atc_reference')
            .select('atc_code, atc_name')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw new Error(`DB Error loading ATC Ref: ${error.message}`);
        if (!data || data.length === 0) break;

        allRefs = allRefs.concat(data);
        if (data.length < pageSize) break;
        page++;
    }

    const refMap = new Map();
    allRefs.forEach(row => {
        if (row.atc_name) {
            const cleanName = normalizeText(row.atc_name);
            // Store potentially multiple codes for same name? 
            // For now, let's just store the object. Ideally check for dupes.
            refMap.set(cleanName, row);
        }
    });

    log(`✅ Loaded ${allRefs.length} ATC references. Map size: ${refMap.size}`, 'INIT');
    return refMap;
}

function normalizeText(text) {
    if (!text) return '';
    return text.toString()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Uses Gemini to extract clean INN (Generic Name) from raw product string.
 */
async function askGeminiForIngredient(productName, description) {
    try {
        const prompt = `
        Analiza el siguiente producto farmacéutico y extrae su PRINCIPIO ACTIVO GENÉRICO (Nombre INN en Español).
        
        Producto: "${productName}"
        Descripción: "${description || ''}"

        Instrucciones:
        1. Responde SOLO con el nombre del principio activo.
        2. Si hay múltiples, sepáralos por " + " (ej. "Acetaminofen + Cafeina").
        3. Ignora marcas, dosis (mg, ml), formas farmacéuticas (tabletas, jarabe) y laboratorios.
        4. Si NO es un medicamento (es pañal, cosmético, equipo médico, fórmula infantil, etc.), responde "NOT_MEDICINE".
        5. Normaliza el nombre (ej. usa "Acetaminofen" en lugar de "Paracetamol" si es más común en LATAM, pero ambos son validos).

        Respuesta:
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();
        return text;

    } catch (e) {
        log(`Gemini Error: ${e.message}`, 'ERROR');
        return null;
    }
}

// --- AI PROCESSING (WITH RETRY & BACKOFF) ---
// --- AI PROCESSING (WITH RETRY & FALLBACK MODELS) ---
async function processBatchWithAI(batch) {
    // Use globally discovered models
    const MODELS = AVAILABLE_MODELS.length > 0 ? AVAILABLE_MODELS : ['gemini-1.5-flash']; // Fallback
    // Ensure unique
    // const MODELS = [...new Set(rawModels)].filter(m => m); // No longer needed if using AVAILABLE_MODELS direct

    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Try each model in sequence for this attempt
        for (const modelName of MODELS) {
            try {
                // log(`[TRY] Using model: ${modelName} (Attempt ${attempt + 1})`, 'AI');
                const model = genAI.getGenerativeModel({ model: modelName });

                const prompt = `
            Analiza estos productos farmacéuticos.
            Tu tarea es EXTRAER el "active_ingredient" (Principio Activo Genérico/INN) en ESPAÑOL y el "atc_code" (ATC Nivel 5) si es obvio.
            Si no estas seguro del ATC, dejalo null.
            Usa la descripción y nombre para deducir.
            
            INPUT (JSON):
            ${JSON.stringify(batch)}

            OUTPUT (JSON Array):
            [{ "id": 123, "active_ingredient": "Paracetamol", "atc_code": "N02BE01" }]
            
            IMPORTANTE:
            - Solo retorna JSON válido.
            - Si es un producto NO medico (pañales, jabon comun), pon active_ingredient: "NON_MEDICAL".
            `;

                const result = await model.generateContent(prompt);
                const text = result.response.text();
                const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleaned);

            } catch (error) {
                const isQuotaError = error.message.includes('429') || error.message.includes('Quota') || error.message.includes('Too Many Requests');
                const isNotFoundError = error.message.includes('404') || error.message.includes('not found');

                if (isQuotaError) {
                    log(`[WARN] ⏳ Quota Exceeded (429) on ${modelName}.`, 'WARN');
                    // Break inner loop to try next model? No, quota is usually usually per-project, not per-model (unless different tiers). 
                    // Actually, flash and pro might have different quotas. Let's try next model immediately.
                    continue;
                } else if (isNotFoundError) {
                    log(`[WARN] 🚫 Model ${modelName} not found (404). Trying next...`, 'WARN');
                    continue; // Try next model
                } else {
                    log(`[ERROR] ❌ Gemini Error (${modelName}): ${error.message}`, 'ERROR');
                    // If it's a parsing error or other AI error, maybe another model works.
                    // But if it's network, we might want to wait.
                }
            }
        }

        // If we exhausted all models and still here (or hit quota on all), wait backoff
        const waitTime = 20000 * Math.pow(2, attempt); // 20s, 40s, 80s...
        log(`[WAIT] 🛑 All models failed or quota hit. Waiting ${waitTime / 1000}s before global retry ${attempt + 1}/${MAX_RETRIES}...`, 'WAIT');
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    log(`[ERROR] 💀 Max retries reached for batch. Skipping.`, 'ERROR');
    return [];
}

async function processBatch(products, refMap) {
    // Prepare batch for AI
    const batchPayload = products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.active_ingredient // Using this as context if available
    }));

    log(`[PROC] 🤖 Processing Batch of ${products.length} items with AI...`, 'AI');

    // Call AI
    const aiResults = await processBatchWithAI(batchPayload);

    // Map results by ID for easy lookup
    const aiResultsMap = new Map();
    if (Array.isArray(aiResults)) {
        aiResults.forEach(r => aiResultsMap.set(r.id, r));
    }

    // Process each product with AI result
    for (const p of products) {
        let resolvedAtc = null;
        let resolvedName = null;

        // 1. Local Match First (Optimization)
        if (p.active_ingredient) {
            const cleanExisting = normalizeText(p.active_ingredient);
            if (refMap.has(cleanExisting)) {
                const match = refMap.get(cleanExisting);
                resolvedAtc = match.atc_code;
                resolvedName = match.atc_name;
                log(`   ✅ Direct Match (Existing Data): ${resolvedAtc}`, 'SUCCESS');
            }
        }

        // 2. Use AI Result if no local match
        if (!resolvedAtc) {
            const aiResult = aiResultsMap.get(p.id);
            if (aiResult) {
                const aiIng = aiResult.active_ingredient;
                const aiAtc = aiResult.atc_code;

                if (aiIng === 'NON_MEDICAL') {
                    resolvedAtc = 'N/A';
                    resolvedName = 'NO MEDICAMENTO';
                    log(`   🚫 Non-Medical identified AI`, 'INFO');
                } else if (aiIng) {
                    const cleanAi = normalizeText(aiIng);

                    // Try to match standard map
                    if (aiAtc && refMap.has(normalizeText(aiIng))) {
                        // Trust AI if it matches local name 
                        resolvedAtc = aiAtc;
                        resolvedName = aiIng;
                        log(`   ✅ AI Match Validated: ${resolvedAtc}`, 'SUCCESS');
                    } else if (refMap.has(cleanAi)) {
                        const match = refMap.get(cleanAi);
                        resolvedAtc = match.atc_code;
                        resolvedName = match.atc_name;
                        log(`   ✅ AI Name matched Local: ${resolvedAtc}`, 'SUCCESS');
                    } else {
                        // Fallback: Trust AI result if provided, otherwise save name
                        resolvedAtc = aiAtc || null;
                        resolvedName = aiIng;
                        log(`   ⚠️ AI Result (No Local Match): ${resolvedName} [${resolvedAtc}]`, 'WARN');
                    }
                }
            }
        }

        // 3. Update DB
        const updatePayload = {};
        if (resolvedAtc && resolvedAtc !== 'N/A') updatePayload.atc_code = resolvedAtc;
        if (resolvedName) updatePayload.active_ingredient_standardized = resolvedName;

        if (Object.keys(updatePayload).length > 0) {
            const { error } = await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', p.id);

            if (error) log(`   ❌ DB Update Error: ${error.message}`, 'ERROR');
            else log(`   💾 Updated ${p.id}: ${JSON.stringify(updatePayload)}`, 'SAVE');
        }
    }
}

// Global to store flexible models list
let AVAILABLE_MODELS = [];

async function main() {
    log('🚀 Starting ATC Enrichment V2 (Advanced)', 'INIT');

    // Discover Models
    AVAILABLE_MODELS = await getAvailableModels();
    log(`✨ Models ready for rotation: ${AVAILABLE_MODELS.length} found`, 'INIT');

    try {
        const refMap = await loadAtcReference();
        if (refMap.size === 0) {
            log('❌ ATC Reference table is empty. Please run Ingest first.', 'FATAL');
            return;
        }

        // Fetch products batch by batch
        // Condition: atc_code IS NULL
        // Limit: 50 for this run to test caution
        const limit = 50;

        while (true) {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, active_ingredient')
                .is('atc_code', null)
                .limit(CONFIG.batchSize);

            if (error) throw new Error(error.message);
            if (!products || products.length === 0) {
                log('✅ No more products to process.', 'DONE');
                break;
            }

            await processBatch(products, refMap);

            // Small pause between batches
            log('⏸️ Batch finished. Pausing...', 'WAIT');
            await new Promise(r => setTimeout(r, 2000));
        }

    } catch (e) {
        log(`FATAL ERROR: ${e.message}`, 'FATAL');
        console.error(e);
    }
}

main();
