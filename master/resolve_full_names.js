
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const partials = [
    "Nifedipina LP 30mg 30tabletas",
    "Minerales + Probióticos Comple",
    "Omega 3 1000 mg Now Frasco x 1",
    "Melatianin Plus  Naturlife's C",
    "Acetaminofén 1 g Tachiforte El",
    "Mupirocin 2% Muproban Siegfrie",
    "Metotrexato 2.5mg Trixate GP P",
    "Melatonina 3 mg + Vitamina B6",
    "Omega 3 1000 mg Aceite De Pesc",
    "Mermelada St Dalfour Cuatro Fr",
    "Mix Antioxidant Snak Club x 15",
    "Momeq 0.05% Furoato De Mometas",
    "Ambroxol 30mg/5ml Bioquimica J",
    "Media Antiembolica Al Muslo Ta",
    "Mascara De Oxigenopara Adultos",
    "Nebulizador Portatil",
    "Plantilla Masajeadora Profoo", // Removed !! for safer search
    "Desodorante Deopies Clinical S",
    "Toallas Sanitarias Wanita Regu",
    "Toalla Postparto Clínica 10 Un",
    "Fórmula Magistral Farmatodo Pr",
    "Crema Caléndula Formula Magist"
];

async function main() {
    console.log("Resolving Full Names...\n");

    for (const part of partials) {
        // Use ilike for partial match
        const { data, error } = await supabase
            .from('products')
            .select('name, category')
            .ilike('name', `%${part}%`)
            .limit(1);

        if (data && data.length > 0) {
            console.log(`[${data[0].category}] ${data[0].name}`);
        } else {
            console.log(`[Not Found] match for: ${part}`);
        }
    }
}

main();
