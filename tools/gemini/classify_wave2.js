const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
// Input from clean_wave2.js output
const INPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/WAVE2_CLEAN_AI.json');
const OUTPUT_FILE = path.join(__dirname, '../../Farmatodo_Reverse/WAVE2_CLASSIFIED.json');
const BATCH_SIZE = 30;
const MODEL_NAME = 'gemini-3-flash-preview';

async function main() {
    if (!API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY missing');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    console.log('📂 Leyendo archivo limpio Wave 2:', INPUT_FILE);
    // Wait logic if file doesn't exist yet (or just fail clearly)
    if (!fs.existsSync(INPUT_FILE)) {
        console.error('❌ Archivo de entrada no encontrado. Asegúrate de que clean_wave2.js haya generado datos.');
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

    const doneIds = new Set(classifiedProducts.map(p => p.id));
    const pendingProducts = products.filter(p => !doneIds.has(p.id));

    console.log(`🚀 Clasificando ${pendingProducts.length} productos restantes (Wave 2)...`);

    for (let i = 0; i < pendingProducts.length; i += BATCH_SIZE) {
        const batch = pendingProducts.slice(i, i + BATCH_SIZE);
        console.log(`\n⚖️ Clasificando lote ${i} - ${i + batch.length}...`);

        try {
            const classifiedBatch = await classifyBatch(model, batch);
            classifiedProducts.push(...classifiedBatch);

            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(classifiedProducts, null, 2));
            console.log(`✅ Progreso guardado: ${classifiedProducts.length}/${products.length}`);

            await new Promise(r => setTimeout(r, 1500));

        } catch (error) {
            console.error(`❌ Error en el lote:`, error.message);
            console.log('⏳ Esperando 5s...');
            await new Promise(r => setTimeout(r, 5000));
            i -= BATCH_SIZE;
        }
    }

    console.log('\n✨ Clasificación Wave 2 completada!');
}

async function classifyBatch(model, batch) {
    const simplifiedBatch = batch.map(p => ({
        id: p.id,
        name: p.clean_name || p.name, // clean_name from Wave 2
        brand: p.brand
    }));

    const prompt = `
    Eres un experto farmacéutico. Clasifica la siguiente lista de productos.
    
    Para cada producto determina:
    - is_pharma: true si es MEDICAMENTO/FÁRMACO. false si es Consumo Masivo/Cosmético/Alimento.
    - type: 'MEDICAMENTO', 'SUPLEMENTO', 'COSMETICO', 'ALIMENTO', 'OTRO'.
    
    CRITERIO:
    - Fármacos, Antibióticos, Analgésicos -> is_pharma: true
    - Champú, Jabón, Pañales, Golosinas, Agua -> is_pharma: false

    Input (JSON):
    ${JSON.stringify(simplifiedBatch)}

    Return ONLY raw JSON Array: [{ "id": "...", "is_pharma": true, "type": "MEDICAMENTO" }, ... ]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const aiResults = JSON.parse(text);

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
