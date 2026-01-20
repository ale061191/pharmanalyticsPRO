/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *                    BACKFILL STOCK HISTORY - PHARMANALYTICS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Genera datos sintéticos de stock para los últimos 7 días.
 * Objetivo: Permitir que el frontend visualice gráficos de crecimiento reales.
 * 
 * Lógica:
 * - Toma los productos de la tabla 'products'.
 * - Para cada producto, crea 7 registros en 'stock_history'.
 * - El stock va disminuyendo aleatoriamente (simulando ventas).
 * 
 * @version 1.0.0
 * @date 2026-01-19
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function backfill() {
    console.log('🏗️ Iniciando Backfill de Stock History...');

    // 1. Obtener una muestra representativa de productos (Top por categoría)
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, category')
        .limit(200);

    if (prodError || !products) {
        console.error('❌ Error al obtener productos:', prodError);
        return;
    }

    const today = new Date();
    const historyEntries = [];

    console.log(`📊 Generando historia para ${products.length} productos...`);

    for (const prod of products) {
        // Inventario base (aleatorio entre 100 y 1000)
        let currentStock = Math.floor(Math.random() * 900) + 100;

        for (let i = 14; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            historyEntries.push({
                product_id: prod.id,
                store_id: '286',
                stock_count: currentStock,
                snapshot_date: dateStr
            });

            // Simular venta: decrementamos stock entre 2% y 15% cada día
            const soldToday = Math.floor(currentStock * (Math.random() * 0.15 + 0.02));
            currentStock = Math.max(0, currentStock - soldToday);
        }
    }

    // 2. Insertar en lotes
    console.log(`📥 Insertando ${historyEntries.length} registros...`);
    const BATCH_SIZE = 500;
    for (let i = 0; i < historyEntries.length; i += BATCH_SIZE) {
        const batch = historyEntries.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
            .from('stock_history')
            .upsert(batch, { onConflict: 'product_id,store_id,snapshot_date' });

        if (insertError) {
            console.error(`❌ Error en lote ${i}:`, insertError.message);
        } else {
            process.stdout.write(`⏳ Procesados: ${Math.min(i + BATCH_SIZE, historyEntries.length)}/${historyEntries.length}\r`);
        }
    }

    console.log('\n✅ Backfill completado exitosamente.');
}

backfill().catch(console.error);
