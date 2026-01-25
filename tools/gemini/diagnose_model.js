const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const MODELS_TO_TEST = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-3-flash-preview',
    'gemini-2.0-flash-exp'
];

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you there?");
        const response = await result.response;
        console.log(`✅ SUCCESS: ${modelName}`);
        console.log(`   Response: ${response.text().slice(0, 50)}...`);
        return true;
    } catch (error) {
        console.log(`❌ FAILED: ${modelName}`);
        // console.error(error.message); // reliable enough
        return false;
    }
}

async function main() {
    console.log('🔍 Diagnosing Gemini Models...');
    for (const name of MODELS_TO_TEST) {
        await testModel(name);
    }
}

main();
