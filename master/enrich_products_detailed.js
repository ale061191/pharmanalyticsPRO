
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Regex for Concentration (e.g. 10mg, 500 mg, 0.5%, 3mg/tablet, etc.)
const CONC_REGEX = /(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|kg|UI|%)(?:\/\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|kg|UI|%))?)/i;

// Keywords for Presentation
const PRESENTATIONS = [
    'Comprimido', 'Tableta', 'Cápsula', 'Jarabe', 'Gel', 'Solución', 'Ampolla',
    'Crema', 'Unguento', 'Inyección', 'Suspensión', 'Gotas', 'Spray', 'Parche',
    'Polvo', 'Vial', 'Granulado', 'Óvulo', 'Supositorio'
];

async function enrich() {
    console.log("🧩 Starting Product Data Enrichment (Concentration & Presentation)...");

    // 1. Read Markdown Data
    const mdPath = path.join(__dirname, 'medicamentos_clasificados_completo.md');
    let mdProducts = new Map();

    if (fs.existsSync(mdPath)) {
        const content = fs.readFileSync(mdPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('| ') && !line.includes('Producto')) {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 6) {
                    const id = parts[1];
                    const name = parts[2];
                    mdProducts.set(id, name);
                }
            }
        }
    }

    // 2. Fetch all products from DB (Paginated)
    let dbProducts = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE_FETCH = 1000;

    while (hasMore) {
        const { data, error: fetchError } = await supabase
            .from('products')
            .select('id, name')
            .range(page * PAGE_SIZE_FETCH, (page + 1) * PAGE_SIZE_FETCH - 1);

        if (fetchError) {
            console.error("Error fetching products:", fetchError);
            break;
        }
        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            dbProducts = dbProducts.concat(data);
            page++;
        }
    }

    console.log(`Processing ${dbProducts.length} products...`);
    let updates = [];

    for (const p of dbProducts) {
        const name = p.name || "";

        // Concentration extraction
        let concentration = null;
        const concMatch = name.match(CONC_REGEX);
        if (concMatch) {
            concentration = concMatch[0].trim();
        }

        // Presentation extraction
        let presentation = null;
        for (const pres of PRESENTATIONS) {
            if (name.toLowerCase().includes(pres.toLowerCase())) {
                presentation = pres;
                break;
            }
        }

        if (concentration || presentation) {
            updates.push({
                id: p.id,
                concentration,
                presentation
            });
        }
    }

    console.log(`Saving enrichment for ${updates.length} products...`);

    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const { error: upsertError } = await supabase
            .from('products')
            .upsert(batch, { onConflict: 'id' });

        if (upsertError) {
            console.error(`Error in batch ${i}:`, upsertError.message);
        } else {
            process.stdout.write('.');
        }
    }

    console.log(`\n✅ Enrichment complete!`);
}

enrich();
