const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
    console.log('Fetching valid models via error...');
    try {
        const model = genAI.getGenerativeModel({ model: 'invalid-model-name-to-force-list' });
        await model.generateContent('Hi');
    } catch (e) {
        console.log('Caught error!');
        fs.writeFileSync('valid_models_log.txt', e.message);
        console.log('Error written to valid_models_log.txt');
    }
}

main();
