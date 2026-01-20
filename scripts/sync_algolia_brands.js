/**
 * Sync Algolia Brand Data to Supabase
 * 
 * This script reads product data from algolia_hits_products.json
 * and updates the lab_name field in Supabase products table using the 'marca' field
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Clean product name by removing special prefixes
function cleanProductName(name) {
    if (!name) return name;
    return name.replace(/^[!\/]+/, '').trim();
}

// Extract brand/lab from product description if available
function extractLabFromDescription(product) {
    // Priority: marca field, then try to extract from description
    if (product.marca && product.marca.trim()) {
        return product.marca.trim();
    }

    // Try to extract from large_description
    if (product.large_description) {
        const labMatch = product.large_description.match(/Laboratorio:\s*([^\n,]+)/i);
        if (labMatch) return labMatch[1].trim();
    }

    return null;
}

async function syncAlgoliaBrands() {
    console.log('🚀 Starting Algolia brand sync...\n');

    // Load Algolia data
    const algoliaPath = path.join(__dirname, '..', 'algolia_hits_products.json');
    if (!fs.existsSync(algoliaPath)) {
        console.error('❌ Algolia data file not found:', algoliaPath);
        return;
    }

    const algoliaProducts = JSON.parse(fs.readFileSync(algoliaPath, 'utf-8'));
    console.log(`📦 Loaded ${algoliaProducts.length} products from Algolia\n`);

    // Build a map: cleaned name -> brand
    const brandMap = new Map();
    for (const p of algoliaProducts) {
        const name = cleanProductName(p.description || p.mediaDescription);
        const brand = extractLabFromDescription(p);
        if (name && brand) {
            brandMap.set(name.toLowerCase(), brand);
        }
    }

    console.log(`🏷️  Found ${brandMap.size} products with brand info\n`);

    // Fetch products from Supabase that need lab_name
    const { data: productsToUpdate, error } = await supabase
        .from('products')
        .select('id, name, lab_name')
        .or('lab_name.is.null,lab_name.eq.')
        .limit(2000);

    if (error) {
        console.error('❌ Error fetching products:', error);
        return;
    }

    console.log(`📋 Found ${productsToUpdate.length} products needing lab_name update\n`);

    let updated = 0;
    let notFound = 0;

    // Update in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < productsToUpdate.length; i += BATCH_SIZE) {
        const batch = productsToUpdate.slice(i, i + BATCH_SIZE);

        for (const product of batch) {
            const cleanName = cleanProductName(product.name);
            const brand = brandMap.get(cleanName?.toLowerCase());

            if (brand) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ lab_name: brand, updated_at: new Date().toISOString() })
                    .eq('id', product.id);

                if (!updateError) {
                    updated++;
                    if (updated <= 10) {
                        console.log(`✅ Updated: "${cleanName}" → Lab: "${brand}"`);
                    }
                }
            } else {
                notFound++;
            }
        }

        // Progress report every 200 products
        if (i % 200 === 0 && i > 0) {
            console.log(`\n📊 Progress: ${i}/${productsToUpdate.length} processed...`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Sync complete!`);
    console.log(`   Updated: ${updated} products`);
    console.log(`   Not found in Algolia: ${notFound} products`);
    console.log('='.repeat(60));
}

// Run the sync
syncAlgoliaBrands().catch(console.error);
