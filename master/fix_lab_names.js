
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Common Laboratories in Venezuela/Latam
const LABS = [
    'Distrilab', 'Cofasa', 'Leti', 'La Santé', 'Klinos', 'Tiares', 'Genven',
    'Biovitak', 'Farmamed', 'Psicofarma', 'Zoriak', 'Poen', 'Grossmed',
    'Pharmetique Labs', 'Roemmers', 'Angelus Health', 'Novartis', 'Sanofi',
    'Bayer', 'Pfizer', 'GSK', 'GlaxoSmithKline', 'Abbott', 'Merck', 'Janssen',
    'AstraZeneca', 'Boehringer Ingelheim', 'MSD', 'Eli Lilly', 'Roche',
    'Servier', 'Takeda', 'Ferrer', 'Grunenthal', 'Menarini', 'Dr. Reddy',
    'Torrent', 'Sun Pharma', 'Lupin', 'Cipla', 'Glenmark', 'Aurobindo',
    'Zydus', 'Intas', 'Alcon', 'Allergan', 'Bausch + Lomb', 'Galderma',
    'Triticum Vulgare', 'Klinos', 'Genven', 'La Sante', 'Cofasa', 'Leti',
    'Pharmanova', 'Valmor', 'Gofarma', 'Eurofarma', 'Beiersdorf', 'Nivea',
    'L\'Oreal', 'Vichy', 'La Roche-Posay', 'Eucerin', 'Procter & Gamble',
    'Unilever', 'Kimberly-Clark', 'Colgate-Palmolive', 'Johnson & Johnson'
];

async function fixLabs() {
    console.log("🔍 Starting Laboratory Name Extraction Repair...");

    let allProducts = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE_FETCH = 1000;

    while (hasMore) {
        const { data, error: fetchError } = await supabase
            .from('products')
            .select('id, name, brand')
            .range(page * PAGE_SIZE_FETCH, (page + 1) * PAGE_SIZE_FETCH - 1);

        if (fetchError) {
            console.error("Error fetching products:", fetchError);
            break;
        }
        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allProducts = allProducts.concat(data);
            page++;
        }
    }

    console.log(`Analyzing ${allProducts.length} products...`);
    const updates = [];

    for (const p of allProducts) {
        const name = p.name || "";
        let extractedLab = 'Genérico';

        // Check if name ends with a known lab or contains it
        for (const lab of LABS) {
            if (name.toLowerCase().includes(lab.toLowerCase())) {
                extractedLab = lab;
                break;
            }
        }

        // If no match found in list, try to get the last word if it's capitalized
        if (extractedLab === 'Genérico') {
            const words = name.trim().split(' ');
            const lastWord = words[words.length - 1];
            if (lastWord && lastWord.length > 2 && /^[A-Z][a-z]+/.test(lastWord)) {
                // Heuristic: Last word capitalized is often the lab
                extractedLab = lastWord;
            }
        }

        // Only update if it's different or if brand was a code
        const isCode = /^\d+/.test(p.brand || "");
        if (isCode || !p.brand || p.brand === 'Genérico') {
            updates.push({
                id: p.id,
                brand: extractedLab
            });
        }
    }

    console.log(`Found ${updates.length} products to update.`);

    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const { error: updateError } = await supabase
            .from('products')
            .upsert(batch, { onConflict: 'id' });

        if (updateError) {
            console.error(`Error in batch ${i}:`, updateError.message);
        } else {
            process.stdout.write('.');
        }
    }

    console.log(`\n✅ Repair complete!`);
}

fixLabs();
