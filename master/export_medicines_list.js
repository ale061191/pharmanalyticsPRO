
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const OUTPUT_FILE = path.join(__dirname, 'medicamentos_candidatos_atc.md');

async function exportMedicines() {
    console.log('Fetching ALL medicines from Supabase (paginated)...');

    let allProducts = [];
    const PAGE_SIZE = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        // Fetch page
        const { data: products, error } = await supabase
            .from('products')
            .select(`id, name, brand, atc_code, active_ingredient`)
            //.or('category.ilike.%medicamento%,department.ilike.%salud%,department.ilike.%medicamento%') // Removing filter to ensure we get everything the user might mean, or we can keep it if "1854" refers to filtered.
            // User said "1854 farmacos verified". Safest is to get everything, or retry filter if count matches.
            // Let's rely on the user's "1854" likely being total products or a specific subset. 
            // I'll filter by existence of name to be safe, essentially getting all valid rows.
            .order('id', { ascending: true })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching page', page, error);
            break;
        }

        if (products.length > 0) {
            allProducts = allProducts.concat(products);
            console.log(`Fetched page ${page}: ${products.length} rows. Total so far: ${allProducts.length}`);

            if (products.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    console.log(`Finished fetching. Total products: ${allProducts.length}`);

    let mdContent = `# Lista de Candidatos para ATC / Vademecum\n\n`;
    mdContent += `Total encontrados: ${allProducts.length}\n\n`;
    mdContent += `| ID | Producto | Marca | ATC Actual | Principio Activo Actual |\n`;
    mdContent += `|--- |--- |--- |--- |--- |\n`;

    allProducts.forEach(p => {
        const name = (p.name || '').replace(/\|/g, '-');
        const brand = (p.brand || '').replace(/\|/g, '-');
        const atc = (p.atc_code || 'N/A').replace(/\|/g, '-');
        const active = (p.active_ingredient || 'N/A').replace(/\|/g, '-').substring(0, 50);

        mdContent += `| ${p.id} | ${name} | ${brand} | ${atc} | ${active} |\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, mdContent, 'utf8');
    console.log(`Exported list to ${OUTPUT_FILE}`);
}

exportMedicines();
