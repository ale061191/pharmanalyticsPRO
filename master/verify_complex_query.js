
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Generando Reporte de Verificación Profunda...\n");

    // 1. Get Categories
    const { data: categoriesRaw, error: catError } = await supabase
        .from('products')
        .select('category');

    if (catError) {
        console.error("Error fetching categories:", catError.message);
        return;
    }

    // Unique categories
    const categories = [...new Set(categoriesRaw.map(c => c.category).filter(c => c))];
    console.log(`Categorías encontradas: ${categories.length}\n`);

    const reportRows = [];
    const usedCities = new Set();

    // 2. Process each category
    for (const cat of categories) {
        // Get 2 random products from this category
        // Since we can't do random efficiently in API easily without RPC, we'll fetch a batch and pick 2
        const { data: products } = await supabase
            .from('products')
            .select('id, name')
            .eq('category', cat)
            .limit(20); // fetch more to ensure we find ones with stock

        if (!products || products.length === 0) continue;

        // Shuffle and pick 2 that have stock
        let foundForCat = 0;

        for (const product of products) {
            if (foundForCat >= 2) break;

            // Check inventory for this product
            // Join with sucursales to get location info
            const { data: inventory } = await supabase
                .from('store_inventory')
                .select(`
                    quantity,
                    sucursales (
                        id, name, city, municipality
                    )
                `)
                .eq('product_id', product.id)
                .gt('quantity', 0); // Only want actual stock to show

            if (!inventory || inventory.length === 0) continue;

            // We need to pick a city. User asked for "distinct city for each one" if possible.
            // Group inventory by city
            const cityMap = new Map(); // City -> { muni -> branch }

            inventory.forEach(item => {
                const s = item.sucursales;
                if (!s) return;
                const cName = s.city;
                if (!cityMap.has(cName)) cityMap.set(cName, new Map());

                const muniMap = cityMap.get(cName);
                if (!muniMap.has(s.municipality)) {
                    muniMap.set(s.municipality, { branch: s.name, stock: item.quantity });
                }
            });

            // Try to find a city not used recently, or just any city with >= 2 munis if possible
            let selectedCity = null;
            let selectedMunis = null;

            // Prioritize cities with at least 2 municipalities
            for (const [cityName, muniMap] of cityMap.entries()) {
                if (muniMap.size >= 2) {
                    selectedCity = cityName;
                    selectedMunis = muniMap;
                    if (!usedCities.has(cityName)) break; // Prefer unused
                }
            }

            // Fallback: any city
            if (!selectedCity && cityMap.size > 0) {
                const first = cityMap.keys().next().value;
                selectedCity = first;
                selectedMunis = cityMap.get(first);
            }

            if (selectedCity) {
                usedCities.add(selectedCity);

                // Convert Map to Array for report
                const muniArray = Array.from(selectedMunis.entries()).slice(0, 2); // Take up to 2

                muniArray.forEach(([muniName, data]) => {
                    reportRows.push({
                        category: cat,
                        product: product.name,
                        city: selectedCity,
                        municipality: muniName,
                        branch: data.branch,
                        stock: data.stock
                    });
                });

                foundForCat++;
            }
        }
    }

    // Print Table
    console.log("| Categoría | Producto | Ciudad | Municipio | Sucursal | Stock |");
    console.log("| :--- | :--- | :--- | :--- | :--- | :--- |");
    reportRows.forEach(r => {
        console.log(`| ${r.category} | ${r.product.substring(0, 30)}... | ${r.city} | ${r.municipality} | ${r.branch} | **${r.stock}** |`);
    });
}

main();
