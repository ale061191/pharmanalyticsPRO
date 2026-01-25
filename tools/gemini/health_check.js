const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

async function check() {
    console.log('🩺 Checking Gemini Health...');
    try {
        const result = await model.generateContent('Ping. Say "Pong" if you can hear me.');
        console.log('✅ Response:', result.response.text());
        console.log('🟢 AI is ALIVE and working.');
    } catch (e) {
        console.error('🔴 Health Check Failed:', e.message);
        if (e.message.includes('429') || e.message.includes('Quota')) {
            console.log('⚠️ CONFIRMED: Quota Limit Reached.');
        }
    }
}

check();
