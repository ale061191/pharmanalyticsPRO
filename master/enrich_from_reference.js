/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENRICH FROM LOCAL REFERENCE (FULL DATASET)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Enriches 'products' by matching against 'atc_reference' table.
 * Implements pagination for BOTH references (load all) and products (process all).
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const CLEANING_REGEX = [
    /\d+(\.|,)?\d*\s?(mg|ml|gr|g|mcg|ui|iu|%)/gi,
    /\b(tabletas|capsulas|solucion|jarabe|inyectable|suspension|crema|unguento|comprimidos|gotas|ampollas|gel|locion|ovulos|supositorios)\b/gi,
    /\b(caja|fco|tubo|blister|sobre|x\d+|x\s?\d+|unidad|unidades)\b/gi,
    /[()\[\]]/g,
    /\s+/g,
    /\b(genfar|calox|leti|behrens|abbott|bayer|pfizer|mck|vivax|genven|la sante|sante)\b/gi
];

function cleanName(name) {
    let clean = name.toLowerCase();
    CLEANING_REGEX.forEach(rx => clean = clean.replace(rx, ' '));
    return clean.replace(/\d/g, '').replace(/\b\w\b/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
    console.log('🚀 Loading ATC Reference Dictionary...');

    // 1. Load ALL ATC references
    let allRefs = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('atc_reference')
            .select('atc_code, atc_name')
            .range(from, from + step - 1);

        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;

        allRefs = allRefs.concat(data);
        from += step;
        process.stdout.write(`   Loading refs... ${allRefs.length}\r`);
    }

    console.log(`\n📚 Loaded ${allRefs.length} ATC references from DB.`);

    const atcMap = new Map();
    allRefs.forEach(r => {
        if (r.atc_name) atcMap.set(r.atc_name.toLowerCase(), { code: r.atc_code, name: r.atc_name });
    });

    console.log('🔍 Processing products in batches...');

    // 2. Process ALL products
    let processedTotal = 0;
    let matchCount = 0;
    let fromProd = 0;
    const prodStep = 1000;

    // Translation Library (Spanish -> English)
    const SP_EN = {
        'amoxicilina': 'amoxicillin', 'ibuprofeno': 'ibuprofen', 'acetaminofen': 'paracetamol', 'paracetamol': 'paracetamol',
        'ciprofloxacina': 'ciprofloxacin', 'azitromicina': 'azithromycin', 'losartan': 'losartan', 'metformina': 'metformin',
        'omeprazol': 'omeprazole', 'sildenafil': 'sildenafil', 'diclofenac': 'diclofenac', 'atorvastatina': 'atorvastatin',
        'levotiroxina': 'levothyroxine', 'enalapril': 'enalapril', 'captopril': 'captopril', 'acido acetilsalicilico': 'acetylsalicylic acid',
        'aspirina': 'acetylsalicylic acid', 'clorfeniramina': 'chlorphenamine', 'loratadina': 'loratadine', 'desloratadina': 'desloratadine',
        'prednisona': 'prednisone', 'dexametasona': 'dexamethasone', 'betametasona': 'betamethasone', 'fluconazol': 'fluconazole',
        'ketoconazol': 'ketoconazole', 'clotrimazol': 'clotrimazole', 'metronidazol': 'metronidazole', 'albendazol': 'albendazole',
        'secnidazol': 'secnidazole', 'lansoprazol': 'lansoprazole', 'pantoprazol': 'pantoprazole', 'esomeprazol': 'esomeprazole',
        'ranitidina': 'ranitidine', 'famotidina': 'famotidine', 'simvastatina': 'simvastatin', 'rosuvastatina': 'rosuvastatin',
        'gemfibrozilo': 'gemfibrozil', 'furosemida': 'furosemide', 'hidroclorotiazida': 'hydrochlorothiazide', 'espirunolactona': 'spironolactone',
        'amlodipino': 'amlodipine', 'nifedipino': 'nifedipine', 'verapamilo': 'verapamil', 'atenolol': 'atenolol', 'bisoprolol': 'bisoprolol',
        'carvedilol': 'carvedilol', 'propranolol': 'propranolol', 'sertralina': 'sertraline', 'fluoxetina': 'fluoxetine',
        'escitalopram': 'escitalopram', 'alprazolam': 'alprazolam', 'clonazepam': 'clonazepam', 'diazepam': 'diazepam',
        'bromazepam': 'bromazepam', 'lorazepam': 'lorazepam', 'tramadol': 'tramadol', 'morfina': 'morphine', 'codeina': 'codeine',
        'fentanilo': 'fentanyl', 'insulina': 'insulin', 'glibenclamida': 'glibenclamide', 'gliclazida': 'gliclazide'
    };

    while (true) {
        const { data: products, error: prodError } = await supabase
            .from('products')
            .select('id, name, active_ingredient')
            .is('atc_code', null)
            .range(fromProd, fromProd + prodStep - 1);

        if (prodError) { console.error(prodError); break; }
        if (!products || products.length === 0) break;

        processedTotal += products.length;
        process.stdout.write(`   Processing batch ${fromProd}... (Total: ${processedTotal}) Matches: ${matchCount}\r`);

        for (const p of products) {
            let candidate = p.active_ingredient;
            if (!candidate || candidate.length < 3) candidate = cleanName(p.name);
            if (!candidate) continue;

            candidate = candidate.toLowerCase().trim();
            let match = atcMap.get(candidate);

            if (!match && candidate.endsWith('o')) match = atcMap.get(candidate.slice(0, -1));
            if (!match && candidate.endsWith('ina')) {
                match = atcMap.get(candidate.slice(0, -3) + 'ine');
                if (!match) match = atcMap.get(candidate.slice(0, -1));
            }
            if (!match) {
                if (SP_EN[candidate]) match = atcMap.get(SP_EN[candidate]);
                const firstWord = candidate.split(' ')[0];
                if (!match && SP_EN[firstWord]) match = atcMap.get(SP_EN[firstWord]);
            }

            if (match) {
                const { error } = await supabase
                    .from('products')
                    .update({ atc_code: match.code, active_ingredient_standardized: match.name })
                    .eq('id', p.id);
                if (!error) matchCount++;
            }
        }

        fromProd += prodStep;
        if (processedTotal > 50000) break; // Safety
    }

    console.log(`\n🏁 Finished. Processed ${processedTotal}. Matched and updated ${matchCount} products.`);
}

main();
