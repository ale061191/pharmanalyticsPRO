const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
// We use the CLEAN file as input because we want to classify based on the clean name if possible, 
// or the original name if clean is ambiguous.
const INPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/FARMATODO_VE_PHARMA_CLEAN_AI.json');
const OUTPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/FARMATODO_VE_PHARMA_CLASSIFIED.json');
const BATCH_SIZE = 30;
const MODEL_NAME = 'gemini-3-flash-preview'; // Keeping the working model

async function main() {
    if (!API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY missing');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    console.log('📂 Leyendo archivo limpio:', INPUT_FILE);
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Archivo de entrada no encontrado. Espera a que termine el script de limpieza.');
        process.exit(1);
    }

    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    let products = JSON.parse(rawData);
    console.log(`📦 Total productos a clasificar: ${products.length}`);

    let classifiedProducts = [];

    // Resume capability
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            classifiedProducts = existing;
            console.log(`🔄 Resumiendo... ya existen ${classifiedProducts.length} clasificados.`);
        } catch (e) {
            console.log('⚠️ Iniciando de cero.');
        }
    }

    // Identify which IDs are already done to skip efficiently
    const doneIds = new Set(classifiedProducts.map(p => p.id));
    const pendingProducts = products.filter(p => !doneIds.has(p.id));

    console.log(`🚀 Clasificando ${pendingProducts.length} productos restantes...`);

    for (let i = 0; i < pendingProducts.length; i += BATCH_SIZE) {
        const batch = pendingProducts.slice(i, i + BATCH_SIZE);
        console.log(`\n⚖️ Clasificando lote ${i} - ${i + batch.length}...`);

        try {
            const classifiedBatch = await classifyBatch(model, batch);
            classifiedProducts.push(...classifiedBatch);

            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(classifiedProducts, null, 2));
            console.log(`✅ Progreso guardado: ${classifiedProducts.length}/${products.length}`);

            await new Promise(r => setTimeout(r, 1000)); // Rate limit niceness

        } catch (error) {
            console.error(`❌ Error en el lote:`, error.message);
            console.log('⏳ Esperando 5s...');
            await new Promise(r => setTimeout(r, 5000));
            i -= BATCH_SIZE; // Retry
        }
    }

    console.log('\n✨ Clasificación completada!');
}

async function classifyBatch(model, batch) {
    // We send ID, clean_name, and original_name for context
    const simplifiedBatch = batch.map(p => ({
        id: p.id,
        name: p.nombre_limpio || p.nombre_original, // Use clean if avail
        category: p.categoria // Context helper
    }));

    const prompt = `
    Eres un experto farmacéutico. Clasifica la siguiente lista de productos.
    
    Para cada producto determina:
    - is_pharma: true si es un MEDICAMENTO, FÁRMACO, o SUPLEMENTO TERAPÉUTICO. false si es Consumo Masivo (Comida, Cosmética, Aseo, Golosinas, Pañales, etc).
    - type: 'MEDICAMENTO', 'SUPLEMENTO', 'COSMETICO', 'ALIMENTO', 'OTRO'.
    
    CRITERIO:
    - Ibuprofeno, Vitaminas, Antibióticos, Leche de Fórmula Médica -> is_pharma: true
    - Chocolates, Champú, Pañales, Agua, Crema Dental regular -> is_pharma: false

    Input (JSON):
    ${JSON.stringify(simplifiedBatch)}

    Return ONLY raw JSON Array: [{ "id": "...", "is_pharma": true, "type": "MEDICAMENTO" }, ... ]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const aiResults = JSON.parse(text);

        // Merge results
        return batch.map(original => {
            const classification = aiResults.find(c => c.id === original.id);
            return {
                ...original,
                is_pharma: classification ? classification.is_pharma : false,
                tipo_producto: classification ? classification.type : 'UNKNOWN'
            };
        });
    } catch (e) {
        console.error('Error parseando respuesta:', text.substring(0, 50));
        throw e;
    }
}

main();
