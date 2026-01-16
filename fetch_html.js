
const fs = require('fs');
const apiKey = 'fc-ac3a5eb65616442abba0153a812e1357';

async function scrape() {
    console.log("🚀 Iniciando scrape HTML directo a Firecrawl...");

    // Actions de Deep Scroll
    const actions = [
        { "type": "wait", "milliseconds": 3000 },
        // 4 Iteraciones de scroll + click (Lite Mode)
        ...Array(4).fill([
            { "type": "scroll", "direction": "down", "milliseconds": 1500 },
            {
                "type": "executeJavascript",
                "script": "document.querySelectorAll('button').forEach(b => { if(b.textContent.includes('Cargar más')) b.click() });"
            },
            { "type": "wait", "milliseconds": 1500 }
        ]).flat(),
        { "type": "wait", "milliseconds": 3000 }
    ];

    try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                url: 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/salud-respiratoria-y-gripe',
                formats: ['html'],
                actions: actions
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.html) {
            fs.writeFileSync('firecrawl_raw.html', data.data.html);
            console.log(`✅ HTML Guardado! Tamaño: ${(data.data.html.length / 1024).toFixed(2)} KB`);
        } else {
            console.error('❌ Error en respuesta:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('🚨 Error fatal:', error);
    }
}

scrape();
