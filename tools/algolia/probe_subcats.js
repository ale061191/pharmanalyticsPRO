const algoliasearch = require('algoliasearch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// CONFIG
const ALGOLIA_APP_ID = "VCOJEYD2PO";
const ALGOLIA_API_KEY = "869a91e98550dd668b8b1dc04bca9011";
const ALGOLIA_INDEX = "products";

async function probePharmaCategories() {
    console.log('💊 Probing "Salud y Medicamentos" Sub-Categories...');
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    const index = client.initIndex(ALGOLIA_INDEX);

    try {
        // Search specifically within the main Pharma category if possible, or just look at facets again
        // We look for 'categories' facet values.
        const res = await index.search('', {
            hitsPerPage: 1,
            facets: ['categories'],
            maxValuesPerFacet: 200, // Get as many as possible
            facetFilters: [['categories:Salud y Medicamentos']] // Force this context if simple string match works
            // Note: Algolia facetFilters syntax is specific. Let's try to get all root categories first using simple facets.
        });

        console.log('✅ Sub-Categories Retrieved:');
        if (res.facets && res.facets.categories) {
            const cats = res.facets.categories;
            // Filter for likely pharma/drug related
            const pharmaKeywords = ['medicamentos', 'salud', 'farma', 'nutricion', 'botiquin', 'formulas'];

            const relevant = Object.keys(cats).filter(c =>
                pharmaKeywords.some(k => c.toLowerCase().includes(k)) ||
                true // Actually, just list all so I can manually pick the deep import list
            );

            relevant.forEach(c => console.log(`   "${c}" (${cats[c]})`));
        }

    } catch (e) {
        console.error('Probe Error:', e);
    }
}

probePharmaCategories();
