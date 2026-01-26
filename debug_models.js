
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');


async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    console.log('Fetching models list from REST API...');
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error);
            return;
        }

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name} (${m.version})`);
                }
            });
        } else {
            console.log('No models found in response:', data);
        }

    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

listModels();
