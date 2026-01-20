
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Init Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    console.log("📸 Iniciando Snapshot Diario de Stock...");
    const today = new Date().toISOString().split('T')[0];

    // 1. Check if snapshot already exists for today
    const { count, error: checkError } = await supabase
        .from('stock_history')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', today);

    if (checkError) {
        console.error("Error checking history:", checkError);
        return;
    }

    if (count > 0) {
        console.log(`⚠️ Ya existe un snapshot para hoy (${today}). Abortando para evitar duplicados.`);
        // Optional: Delete and recreate if force needed, but safer to skip.
        return;
    }

    // 2. Fetch current inventory
    // We need: product_id, store_id, stock_count.
    // NOTE: 'store_inventory' usually has 'product_id', 'store_id', 'stock'.
    // Let's verify store_inventory content. Ideally we just select * and insert.

    // Pagination required for large datasets?
    // store_inventory could be huge (Items * Stores).
    // If we have 4000 active products * 200 stores = 800,000 rows.
    // We MUST use cursor/pagination or a direct SQL copy if possible.
    // Since we are client-side here, we should paginate.

    const PAGE_SIZE = 1000;
    let hasMore = true;
    let page = 0;
    let totalInserted = 0;

    console.log("📥 Leyendo inventario actual...");

    while (hasMore) {
        const { data: inventory, error: fetchError } = await supabase
            .from('store_inventory')
            .select('product_id, sucursal_id, quantity')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (fetchError) {
            console.error("Error fetching inventory:", fetchError);
            break;
        }

        if (!inventory || inventory.length === 0) {
            hasMore = false;
            break;
        }

        // Transform for history table
        const historyRows = inventory.map(row => ({
            product_id: row.product_id,
            store_id: row.sucursal_id,
            stock_count: row.quantity, // Remap quantity -> stock_count
            snapshot_date: today
        }));

        // Insert batch
        const { error: insertError } = await supabase
            .from('stock_history')
            .insert(historyRows);

        if (insertError) {
            console.error("Error submitting snapshot batch:", insertError);
        } else {
            totalInserted += historyRows.length;
            process.stdout.write(`\r💾 Insertados: ${totalInserted}`);
        }

        page++;
        // Safety break for tests
        // if (page > 50) break; 
    }

    console.log(`\n✅ Snapshot completado. Total registros: ${totalInserted}`);

    // --- REFRESH PERFORMANCE TABLE ---
    console.log("🚀 Actualizando motor de analítica (product_performance)...");
    const { error: refreshError } = await supabase.rpc('refresh_product_performance');
    if (refreshError) {
        console.error("❌ Error al refrescar tabla de performance:", refreshError.message);
    } else {
        console.log("✨ Dashboard listo con métricas actualizadas.");
    }
}

main();
