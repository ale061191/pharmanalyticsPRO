/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *                    ATC SYNC VERIFIER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Verifica que los códigos ATC y Principios Activos se hayan cargado correctamente.
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

async function verifySync() {
    console.log('🔍 Verificando sincronización ATC...');

    // 1. Contar cuántos productos tienen atc_code != null
    const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .not('atc_code', 'is', null);

    if (countError) {
        console.error('❌ Error al contar productos con ATC:', countError.message);
    } else {
        console.log(`📊 Productos con Código ATC en la DB: ${count}`);
    }

    // 2. Muestrear algunos productos para verificar visualmente
    const { data: samples, error: sampleError } = await supabase
        .from('products')
        .select('id, name, atc_code, active_ingredient')
        .not('atc_code', 'is', null)
        .limit(5);

    if (sampleError) {
        console.error('❌ Error al obtener muestras:', sampleError.message);
    } else {
        console.log('\n🧪 Muestra de datos actualizados:');
        console.table(samples);
    }

    // 3. Verificar un ID específico del archivo MD (e.g. 114430391 -> R06AX13)
    const testId = '114430391';
    const { data: testItem, error: testError } = await supabase
        .from('products')
        .select('id, atc_code, active_ingredient')
        .eq('id', testId)
        .single();

    if (testError) {
        console.error(`❌ Error al verificar ID ${testId}:`, testError.message);
    } else {
        console.log(`\n🔎 Verificación puntual (ID ${testId}):`);
        console.log(`   Esperado: R06AX13 | Obtenido: ${testItem.atc_code}`);
        if (testItem.atc_code === 'R06AX13') {
            console.log('   ✅ COINCIDE');
        } else {
            console.log('   ❌ NO COINCIDE');
        }
    }
}

verifySync().catch(err => {
    console.error('💥 Error inesperado:', err);
});
