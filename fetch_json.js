require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const API_KEY = process.env.FIRECRAWL_API_KEY;
const URL = 'https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/salud-respiratoria-y-gripe';

if (!API_KEY) {
    console.error("❌ FALTA FIRECRAWL_API_KEY en .env.local");
    process.exit(1);
}

// Prompt para el LLM de Firecrawl
const EXTRACTION_PROMPT = `
Extract all products visible on the page. 
For each product, extract:
- name: The full product name properly capitalized.
- lab: The laboratory or brand name (usually appears above or near the number).
- price: The current price as a number (remove 'Bs.', '.', and ',' appropriately to get a float).
- original_price: The price before discount if available.
- image_url: The URL of the product image.
- product_url: The full URL link to the product detail page.

Important: The page uses infinite scroll or a 'Cargar más' button. 
Try to get as many products as possible from the loaded DOM.
`;

const SCHEMA = {
    type: "object",
    properties: {
        products: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    lab: { type: "string" },
                    price: { type: "number" },
                    original_price: { type: "number" },
                    image_url: { type: "string" },
                    product_url: { type: "string" }
                },
                required: ["name", "price", "product_url"]
            }
        }
    }
};

async function main() {
    console.log("🚀 Iniciando Scrape JSON con Firecrawl...");

    // Usamos el endpoint scrape con extract
    // Nota: El endpoint 'scrape' con 'extract' es lo ideal si la librería lo soporta.
    // Si no, usaremos una llamada fetch directa al endpoint v1/scrape

    try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                url: URL,
                formats: ['extract'],
                extract: {
                    schema: SCHEMA,
                    prompt: EXTRACTION_PROMPT
                },
                actions: [
                    { type: 'wait', milliseconds: 3000 },
                    { type: 'scroll', direction: 'down', amount: 1000 },
                    { type: 'wait', milliseconds: 2000 },
                    { type: 'scroll', direction: 'down', amount: 1000 },
                    { type: 'wait', milliseconds: 2000 }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            console.error("❌ Falló el scrape:", data.error);
            return;
        }

        const extractedData = data.data.extract;

        fs.writeFileSync('firecrawl_products.json', JSON.stringify(extractedData, null, 2));
        console.log(`✅ Éxito! ${extractedData.products ? extractedData.products.length : 0} productos guardados en firecrawl_products.json`);

    } catch (error) {
        console.error("❌ Error Fatal:", error);
    }
}

main();
