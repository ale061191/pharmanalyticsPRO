const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY no encontrada.');
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    try {
        console.log('🔄 Consultando modelos disponibles...');
        // Note: listModels might be on the model manager or similar depending on lib version
        // In @google/generative-ai, we might not have a direct listModels helper on the top level class in some versions,
        // but let's try the standard way if available or infer from a simple call.

        // Actually, the SDK wraps it. Let's try to just use a known stable model to "ping" or 
        // if capabilities allow, list. 
        // Since the current Node SDK doesn't always expose listModels directly easily in all versions without admin scope,
        // I will try to call the list models endpoint using fetch directly to be safe and raw.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log('\n✅ Modelos Disponibles:');
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName})`);
            });
        } else {
            console.error('❌ No se recibieron modelos. Respuesta:', data);
        }

    } catch (e) {
        console.error('❌ Error listando modelos:', e.message);
    }
}

listModels();
