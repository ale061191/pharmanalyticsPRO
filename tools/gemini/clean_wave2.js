const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
const INPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/WAVE2_RAW.json');
const OUTPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/WAVE2_CLEAN_AI.json');
const BATCH_SIZE = 30;
const START_INDEX = 0;
const MAX_ITEMS = 100000; // Process all
// ---------------------

async function main() {
    if (!API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY no definida');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    // Use gemini-3-flash-preview as it was confirmed working in Wave 1
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    console.log('📂 Leyendo archivo de entrada:', INPUT_FILE);
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Archivo de entrada no encontrado.');
        process.exit(1);
    }

    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    let products = JSON.parse(rawData);

    console.log(`📦 Total productos cargados: ${products.length}`);

    let cleanedProducts = [];

    // Resume support
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            cleanedProducts = existing;
            console.log(`🔄 Resumiendo... ya existen ${cleanedProducts.length} procesados.`);
        } catch (e) {
            console.log('⚠️ No se pudo leer el archivo existente. Iniciando de cero.');
        }
    }

    const totalToProcess = Math.min(products.length, MAX_ITEMS);
    console.log(`🚀 Procesando ${totalToProcess} productos con Gemini...`);

    for (let i = cleanedProducts.length; i < totalToProcess; i += BATCH_SIZE) {
        const batch = products.slice(i, Math.min(i + BATCH_SIZE, totalToProcess));
        console.log(`\n🔄 Procesando lote ${i} - ${i + batch.length}...`);

        try {
            const processedBatch = await cleanBatchCheck(model, batch);
            cleanedProducts.push(...processedBatch);

            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanedProducts, null, 2));
            console.log(`✅ Progreso guardado: ${cleanedProducts.length}/${totalToProcess}`);

            // Rate limit buffer
            await new Promise(r => setTimeout(r, 2000));

        } catch (error) {
            console.error(`❌ Error en el lote ${i}:`, error.message);
            console.log('⏳ Esperando 10 segundos antes de reintentar...');
            await new Promise(r => setTimeout(r, 10000));
            i -= BATCH_SIZE;
        }
    }

    console.log('\n✨ Limpieza completada!');
    console.log(`💾 Archivo guardado en: ${OUTPUT_FILE}`);
}

async function cleanBatchCheck(model, batch) {
    const prompt = `
    Actúas como expertos en datos farmacéuticos. Tarea: Limpiar nombres de productos.
    
    Input (JSON):
    ${JSON.stringify(batch.map(p => ({ id: p.id, original_name: p.name, brand: p.brand })))}

    Devuelve un JSON Array con:
    - id: ID original.
    - clean_name: NOMBRE COMERCIAL LIMPIO (Marca principal).
      - Ej: "Acetaminofén 500mg Genfar" -> "Acetaminofén"
      - Ej: "Dolex Niños Jarabe" -> "Dolex Niños"
      - Ej: "Hidrosamin 2ml Ampolla" -> "Hidrosamin"
      - Regla de oro: Elimina concentraciones (mg, ml, g), "Caja", "Tableta", "Frasco". Deja solo el nombre reconocible para búsqueda.
    - active_ingredient: El principio activo (ej: Ibuprofeno) si se detecta.
    - presentation: La presentación (Tabletas, Jarabe, etc).

    IMPORTANT: Return ONLY valid JSON Array []. No markdown.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const cleanedBatch = JSON.parse(text);

        return batch.map(original => {
            const clean = cleanedBatch.find(c => c.id === original.id);
            if (!clean) return original;

            return {
                ...original,
                nombre_limpio: clean.clean_name,
                // Adapt to Supabase schema names directly if possible, or keep intermediate format
                // Keeping intermediate format similar to Wave 1 for consistency
                clean_name: clean.clean_name,
                active_ingredient: clean.active_ingredient,
                presentation: clean.presentation
            };
        });

    } catch (e) {
        console.error('Error parsing Gemini:', text.substring(0, 100));
        throw e;
    }
}

main();
