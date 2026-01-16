
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// ------------------------------------------------------------------
// CONFIGURACIÓN DE SUPABASE
// ------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------------------------------------------------------
// FUNCIÓN DE PARSEO
// ------------------------------------------------------------------
function parseProductsFromMarkdown(markdown) {
    const products = [];
    const lines = markdown.split('\n').map(l => l.trim()).filter(l => l);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Patrón Relaxed: Busca "**Bs.X.XXX,XX" en cualquier parte de la línea
        // Esto captura "**Bs.3.455.28**" incluso si sigue "~~Bs.4.319.10~~"
        const priceMatch = line.match(/\*\*Bs\.([\d\.]+,\d{2}|[\d\.]+\.\d{2})\*\*/);

        if (priceMatch) {
            const currentPriceStr = priceMatch[1];
            let rawNum = currentPriceStr.replace('Bs.', '').trim();
            let priceVal = 0;

            if (rawNum.includes(',')) {
                priceVal = parseFloat(rawNum.replace(/\./g, '').replace(',', '.'));
            } else {
                const parts = rawNum.split('.');
                if (parts.length > 1) {
                    const decimal = parts.pop();
                    const integer = parts.join('');
                    priceVal = parseFloat(`${integer}.${decimal}`);
                } else {
                    priceVal = parseFloat(rawNum);
                }
            }

            // Buscar Nombre y Lab hacia atrás
            let offset = 1;
            // Saltar líneas basura
            while (i - offset >= 0) {
                const prev = lines[i - offset];
                if (prev.includes('%') || prev.includes('mins') || prev.includes('Dcto') || prev.includes('Bs') || prev === '¡Aprovecha!' || prev.startsWith('Solo DELIVERY')) {
                    offset++;
                    continue;
                }
                break;
            }

            const name = lines[i - offset];

            let labOffset = offset + 1;
            while (i - labOffset >= 0) {
                const prev = lines[i - labOffset];
                if (prev.includes('%') || prev.includes('mins') || prev === '¡Aprovecha!' || prev === 'Solo DELIVERY - 15% Dcto. 1era Compra') {
                    labOffset++;
                    continue;
                }
                break;
            }
            const lab = lines[i - labOffset];

            // Validación: Nombre debe existir, largo > 3, no ser precio ni markdown bold puro
            // Y CRÍTICO: No puede ser igual al nombre del Laboratorio (evita error de parseo)
            const KNOWN_LABS = new Set(['Oftalmi', 'Vivax', 'Calox', 'Genfar', 'La Santé', 'La Sante', 'Meyer', 'Genven', 'Leti', 'Bayer', 'Elmor', 'Varios', 'Behrens', 'McK Pharmaceutical', 'Lasca', 'Sanofi Aventis', 'Grupo Vargas']);

            if (name && name.length > 3 && !name.startsWith('**') && !name.startsWith('Bs') && !KNOWN_LABS.has(name)) {
                products.push({
                    name: name,
                    lab_name: lab || 'Desconocido',
                    price: priceVal
                });
            }
        }
    }
    return products;
}

// ------------------------------------------------------------------
// FUNCIÓN DE UPSERT
// ------------------------------------------------------------------
async function upsertProducts(products) {
    console.log(`📦 Procesando ${products.length} productos...`);

    // Upsert en batches de 50 para eficiencia
    const BATCH_SIZE = 50;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);

        for (const p of batch) {
            const { data: existing } = await supabase
                .from('products')
                .select('id, avg_price')
                .eq('name', p.name)
                .single();

            if (existing) {
                if (existing.avg_price !== p.price) {
                    console.log(`🔄 [${i}] Actualizando: ${p.name}`);
                    await supabase.from('products').update({
                        avg_price: p.price,
                        lab_name: p.lab_name,
                        updated_at: new Date()
                    }).eq('id', existing.id);
                }
            } else {
                console.log(`✨ [${i}] Creando: ${p.name}`);
                await supabase.from('products').insert({
                    name: p.name,
                    lab_name: p.lab_name,
                    avg_price: p.price,
                    stock_count: 0,
                    category: 'Salud Respiratoria'
                });
            }
        }
    }
}

async function main() {
    const filePath = path.join(__dirname, 'firecrawl_raw.md');
    if (!fs.existsSync(filePath)) {
        console.error("❌ No encuentro el archivo firecrawl_raw.md");
        return;
    }

    const md = fs.readFileSync(filePath, 'utf-8');
    const products = parseProductsFromMarkdown(md);

    console.log(`✅ Encontrados ${products.length} productos válidos en el Markdown.`);

    if (products.length > 0) {
        await upsertProducts(products);
    }
}

main();
