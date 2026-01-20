
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const CATALOG_FILE = path.join(__dirname, 'data', 'algolia_products.json');
const STOCK_FILE = path.join(__dirname, 'data', 'pharmacy_catalog_final.json');

// Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Starting DB Population (Full Catalog Merge)...");

    if (!fs.existsSync(CATALOG_FILE) || !fs.existsSync(STOCK_FILE)) {
        console.error("Missing input files.");
        return;
    }

    // 1. Load Data
    const catalogRaw = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
    const stockRaw = JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));

    // Create Map for fast lookup of detailed stock
    const stockMap = new Map(stockRaw.map(item => [item.id, item]));

    console.log(`Loaded Catalog: ${catalogRaw.length} products.`);
    console.log(`Loaded Stock Details: ${stockRaw.length} products with stock.`);

    // 2. Prepare Data Structures
    const branches = new Map();
    const stockEntries = [];
    const products = [];

    const seenIds = new Set();

    catalogRaw.forEach(p => {
        if (seenIds.has(p.id)) return;
        seenIds.add(p.id);

        const enriched = stockMap.get(p.id);

        let finalName = p.name || p.mediaDescription || p.description || "Producto Desconocido";

        // Determine Original Price (Reference Only)
        // Prefer enriched value, fallback to catalog value
        const refPrice = enriched?.original_price || p.price_full || 0;

        // Product Metadata 
        products.push({
            id: p.id,
            name: finalName,
            brand: p.brand || 'Genérico',
            category: p.category,
            department: p.department,
            image_url: p.image || enriched?.image || p.mediaImageUrl,
            updated_at: new Date().toISOString(),
            // STOCK-CENTRIC MODEL:
            original_price: refPrice, // Saved for reference
            avg_price: 0 // Enforced 0
        });

        // Stock & Branches
        if (enriched && enriched.stock_granular) {
            enriched.stock_granular.forEach(s => {
                if (!branches.has(s.store_id)) {
                    branches.set(s.store_id, {
                        id: s.store_id,
                        name: s.store_name,
                        city: s.city,
                        municipality: s.municipality,
                        address: s.address,
                        lat: s.lat,
                        lng: s.lng,
                        updated_at: new Date().toISOString()
                    });
                }

                stockEntries.push({
                    product_id: p.id,
                    sucursal_id: s.store_id,
                    quantity: s.units,
                    last_checked: new Date().toISOString()
                });
            });
        }
    });

    console.log(`Final Products to Sync: ${products.length}`);
    console.log(`Unique Branches to Sync: ${branches.size}`);
    console.log(`Stock Entries to Sync: ${stockEntries.length}`);

    // 3. Upsert Branches
    const branchList = Array.from(branches.values());
    if (branchList.length > 0) {
        console.log("Upserting Branches...");
        const { error } = await supabase.from('sucursales').upsert(branchList, { onConflict: 'id' });
        if (error) console.error("Error upserting branches:", error);
        else console.log("Branches synced.");
    }

    // 4. Upsert Products (Batch 100)
    console.log("Upserting Products...");
    for (let i = 0; i < products.length; i += 100) {
        const batch = products.slice(i, i + 100);
        const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
        if (error) console.error(`Error batch ${i}:`, error.message);
    }
    console.log("\nProducts synced.");

    // 5. Upsert Store Inventory (Batch 500)
    console.log("Upserting Store Inventory...");
    for (let i = 0; i < stockEntries.length; i += 500) {
        const batch = stockEntries.slice(i, i + 500);
        const { error } = await supabase.from('store_inventory').upsert(batch, { onConflict: 'product_id,sucursal_id' });
        if (error) console.error(`Error stock batch ${i}:`, error.message);
        else process.stdout.write(".");
    }
    console.log("\nInventory synced.");
}

main();
