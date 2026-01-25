const algoliasearch = require('algoliasearch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// CONFIG
const ALGOLIA_APP_ID = "VCOJEYD2PO";
const ALGOLIA_API_KEY = "869a91e98550dd668b8b1dc04bca9011";
const ALGOLIA_INDEX = "products";

async function getFacets() {
    console.log('🔬 Probing Algolia Categories...');
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
    const index = client.initIndex(ALGOLIA_INDEX);

    try {
        // We want to find the exact facet name for categories
        // Usually "categories.lvl0", "categories.lvl1", etc.
        // We search for everything and ask for facets.
        const res = await index.search('', {
            hitsPerPage: 1,
            facets: ['*'],
            maxValuesPerFacet: 100
        });

        console.log('✅ Facets Retrieved:');
        const facets = res.facets;

        // Look for category-like facets
        if (facets) {
            Object.keys(facets).forEach(facetName => {
                if (facetName.includes('categ') || facetName.includes('lvl')) {
                    console.log(`\n📂 Facet: ${facetName}`);
                    const values = facets[facetName];
                    Object.keys(values).forEach(val => {
                        console.log(`   - ${val} (${values[val]})`);
                    });
                }
            });
        } else {
            console.log('⚠️ No facets returned. Try specifying common names.');
        }

    } catch (e) {
        console.error('Probe Error:', e);
    }
}

getFacets();
