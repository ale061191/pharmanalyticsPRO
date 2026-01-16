const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Only target the missing or incomplete categories
const categories = [
    { name: "Medicamentos", slug: "medicamentos" },
    { name: "Vitaminas y Productos Naturales", slug: "vitaminas-y-productos-naturales" }
];

const apiKey = process.env.FIRECRAWL_API_KEY;
const outputDir = path.join(__dirname, 'raw_html');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeCategory(category) {
    const url = `https://www.farmatodo.com.ve/categorias/salud-y-medicamentos/${category.slug}`;
    console.log(`\n🚀 Starting RETRY for: ${category.name}`);

    // Robust "Load More" logic - Increased wait times slightly for stability
    const actions = [
        { "type": "wait", "milliseconds": 5000 },
        {
            "type": "executeJavascript",
            "script": `
                (async () => {
                    const selector = "button.cont-button-more"; 
                    // Try to scroll and click multiple times
                    for(let i=0; i<25; i++) { 
                        const btn = document.querySelector(selector);
                        if(!btn) {
                            console.log("No button found, stopping.");
                            break;
                        }
                        btn.click();
                        await new Promise(r => setTimeout(r, 3000)); 
                        window.scrollTo(0, document.body.scrollHeight);
                        await new Promise(r => setTimeout(r, 2000));
                    }
                })();
            `
        },
        { "type": "wait", "milliseconds": 5000 }
    ];

    try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                url: url,
                formats: ['html'],
                actions: actions,
                timeout: 420000 // 7 minutes (increased from 5)
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP Error: ${response.status} - ${text.substring(0, 500)}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.html) {
            const filename = path.join(outputDir, `${category.slug}.html`);
            fs.writeFileSync(filename, data.data.html);
            console.log(`✅ Saved: ${filename} (${(data.data.html.length / 1024).toFixed(2)} KB)`);
        } else {
            console.error('❌ Firecrawl error:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error(`🚨 Failed to process ${category.name}:`, error.message);
    }
}

async function runBatch() {
    for (const category of categories) {
        await scrapeCategory(category);
        await delay(5000);
    }
    console.log("🏁 Retry batch complete.");
}

runBatch();
