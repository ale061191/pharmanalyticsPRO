const algoliasearch = require('algoliasearch');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Algolia Config
const APP_ID = "VCOJEYD2PO";
const API_KEY = "869a91e98550dd668b8b1dc04bca9011";
const INDEX_NAME = "products";

// Supabase Config
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    console.log('🌍 Starting Gap Analysis (Venezuelan Market vs Local DB)...');

    const client = algoliasearch(APP_ID, API_KEY);
    const index = client.initIndex(INDEX_NAME);

    // 1. Verify Origin (Sample Check)
    console.log('\n🔍 Phase 1: Verifying Venezuelan Origin of existing products...');
    const { data: dbSample } = await supabase.from('products').select('id, name, clean_name').limit(20);

    let verifiedCount = 0;

    for (const p of dbSample) {
        const query = p.clean_name || p.name;
        // Search in Farmatodo
        try {
            const res = await index.search(query, { hitsPerPage: 1 });
            const isFound = res.nbHits > 0;
            const hit = res.hits[0];
            const productsName = hit ? (hit.description || hit.mediaDescription || hit.name) : "N/A";

            const status = isFound ? `✅ Verified (Found: ${productsName})` : "❓ Not Found in Farmatodo";
            console.log(`   [${p.name.slice(0, 30)}...] -> ${status}`);
            if (isFound) verifiedCount++;
        } catch (e) {
            console.log(`   Error searching ${query}`);
        }
    }
    console.log(`   Result: ${verifiedCount}/${dbSample.length} verified in Farmatodo Venezuela catalog.`);

    // 2. Discover Missing Products (Gap)
    console.log('\n🔍 Phase 2: Discovering Missing Products...');
    // We search for a broad term or empty query to get popular items
    // Algolia browse or search empty
    const { hits } = await index.search('', {
        hitsPerPage: 50,
        facetFilters: ['categories.lvl0:Salud y Medicamentos'] // Try to target medicines
        // Note: Facets might differ, need to guess or inspect.
        // Inspecting previous sample might help. 
        // For now, simple search "Doliprane", "Acetaminofen", "Losartan" or just broad.
    });

    console.log(`   Fetched ${hits.length} top products from Farmatodo Vzla.`);

    let newDiscoveryCount = 0;
    for (const hit of hits) {
        // Check if exists in our DB (fuzzy match on name)
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .ilike('name', `%${hit.name}%`) // Simple check
            .limit(1);

        if (!existing || existing.length === 0) {
            console.log(`   🆕 MISSING LOCAL: ${hit.name} (Bs. ${hit.price})`);
            newDiscoveryCount++;
        }
    }

    console.log(`   Discovery: Found ${newDiscoveryCount} potential new products to ingest.`);
}

main();
