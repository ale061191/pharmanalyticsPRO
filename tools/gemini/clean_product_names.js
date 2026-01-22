const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
const INPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/FARMATODO_VE_PHARMA_FILTRADO.json');
const OUTPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/FARMATODO_VE_PHARMA_CLEAN_AI.json');
const BATCH_SIZE = 30; // Number of items to process in one API call
const START_INDEX = 0; // Resume extraction if needed
const MAX_ITEMS = 1000000; // Process all or limit for testing (e.g., 50)
// ---------------------

async function main() {
    if (!API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY no está definida en las variables de entorno (.env)');
        console.log('💡 Obtén una gratis en: https://aistudio.google.com/app/apikey');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' }); // Cutting edge 2026 model

    console.log('📂 Leyendo archivo de entrada:', INPUT_FILE);
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Archivo de entrada no encontrado.');
        process.exit(1);
    }

    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    let products = JSON.parse(rawData);

    // Filter or slice for testing
    // products = products.slice(0, 50); // Uncomment to test with just 50 items

    console.log(`📦 Total productos cargados: ${products.length}`);

    let cleanedProducts = [];

    // Resume support
    if (fs.existsSync(OUTPUT_FILE) && START_INDEX > 0) {
        try {
            const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            cleanedProducts = existing;
            console.log(`🔄 Resumiendo... ya existen ${cleanedProducts.length} procesados.`);
        } catch (e) {
            console.log('⚠️ No se pudo leer el archivo existente para resumir. Iniciando de cero.');
        }
    }

    const totalToProcess = Math.min(products.length, MAX_ITEMS);
    console.log(`🚀 Procesando ${totalToProcess} productos con Gemini Flash...`);

    for (let i = cleanedProducts.length; i < totalToProcess; i += BATCH_SIZE) {
        const batch = products.slice(i, Math.min(i + BATCH_SIZE, totalToProcess));
        console.log(`\n🔄 Procesando lote ${i} - ${i + batch.length}...`);

        try {
            const processedBatch = await cleanBatchCheck(model, batch);
            cleanedProducts.push(...processedBatch);

            // Save progress every batch
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanedProducts, null, 2));
            console.log(`✅ Progreso guardado: ${cleanedProducts.length}/${totalToProcess}`);

            // Respect rate limits simply
            await new Promise(r => setTimeout(r, 2000));

        } catch (error) {
            console.error(`❌ Error en el lote ${i}:`, error.message);
            console.log('⏳ Esperando 10 segundos antes de reintentar...');
            await new Promise(r => setTimeout(r, 10000));
            i -= BATCH_SIZE; // Retry this batch
        }
    }

    console.log('\n✨ Limpieza completada!');
    console.log(`💾 Archivo guardado en: ${OUTPUT_FILE}`);
}

async function cleanBatchCheck(model, batch) {
    const prompt = `
    Actúas como un experto farmacéutico y analista de datos.
    Tu tarea es limpiar los nombres de una lista de productos farmacéuticos.
    
    Los nombres actuales ("original_name") están sucios: contienen presentación, miligramos, laboratorio, y a veces el principio activo está antes que el nombre comercial.

    Para cada producto, devuelve un objeto JSON con:
    - id: El mismo ID original.
    - clean_name: El NOMBRE COMERCIAL limpio. (Ej: "Dol Kids", "Atamel", "Losartán"). 
      - Si es genérico, usa el Principio Activo como nombre limpio.
      - NO incluyas mg, ml, ni "Caja x...". Solo la marca o nombre base.
    - active_ingredient: El principio activo extraído (si es obvio en el texto).
    - presentation: La presentación (Tabletas, Jarabe, 500mg, Caja x 10, etc).
    
    Input (JSON):
    ${JSON.stringify(batch.map(p => ({ id: p.id, original_name: p.nombre, lab: p.laboratorio })))}

    IMPORTANT: Return ONLY the raw JSON Array. No markdown formatting, no code blocks like \`\`\`json. Just the array [ ... ].
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean markdown if Gemini adds it despite instructions
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const cleanedBatch = JSON.parse(text);

        // Merge with original data to keep pricing/stock info
        return batch.map(original => {
            const clean = cleanedBatch.find(c => c.id === original.id);
            if (!clean) return original; // Fallback

            return {
                ...original,
                nombre_limpio: clean.clean_name,
                nombre_original: original.nombre, // Keep original just in case
                principio_activo_detectado: clean.active_ingredient,
                presentacion_detectada: clean.presentation
            };
        });

    } catch (e) {
        console.error('Error parseando respuesta de Gemini:', text.substring(0, 100) + '...');
        throw e;
    }
}

main();
