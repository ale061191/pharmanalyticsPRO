/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *                    ATC DATA SYNC - PHARMANALYTICS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Sincroniza códigos ATC y Principios Activos desde el archivo Markdown
 * proporcionado por el usuario hacia la tabla 'products' de Supabase.
 * 
 * @version 1.0.0
 * @date 2026-01-19
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MD_FILE_PATH = path.join(__dirname, 'medicamentos_clasificados_completo.md');

async function syncATCData() {
    console.log('🚀 Iniciando sincronización de datos ATC...');

    if (!fs.existsSync(MD_FILE_PATH)) {
        console.error(`❌ El archivo no existe: ${MD_FILE_PATH}`);
        return;
    }

    const content = fs.readFileSync(MD_FILE_PATH, 'utf8');
    const lines = content.split('\n');

    // Buscar la línea donde comienza la tabla
    const tableStartIndex = lines.findIndex(line => line.includes('| ID | Producto |'));
    if (tableStartIndex === -1) {
        console.error('❌ No se encontró la tabla de clasificación en el archivo.');
        return;
    }

    // Omitir el encabezado y el separador (|---|---|)
    const dataLines = lines.slice(tableStartIndex + 2);

    const productsToUpdate = [];

    console.log('📦 Parseando archivo Markdown...');

    for (const line of dataLines) {
        if (!line.trim() || !line.startsWith('|')) continue;

        // Formato: | ID | Producto | Marca | Código ATC | Principio Activo |
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 6) continue;

        const id = parts[1];
        let atcCode = parts[4];
        let activeIngredient = parts[5];

        // Limpiar valores "N/A" o "Sin clasificar"
        if (atcCode === 'N/A') atcCode = null;
        if (activeIngredient === 'Sin clasificar') activeIngredient = null;

        productsToUpdate.push({
            id: id,
            atc_code: atcCode,
            active_ingredient: activeIngredient
        });
    }

    console.log(`✅ Se encontraron ${productsToUpdate.length} productos para procesar.`);

    // Procesar en lotes de 100 para evitar límites de la API
    const BATCH_SIZE = 100;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < productsToUpdate.length; i += BATCH_SIZE) {
        const batch = productsToUpdate.slice(i, i + BATCH_SIZE);

        // Supabase upsert por ID
        // Usamos upsert con onConflict: 'id' para actualizar
        const { error } = await supabase
            .from('products')
            .upsert(batch, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Error al actualizar lote ${i / BATCH_SIZE + 1}:`, error.message);
            failCount += batch.length;
        } else {
            successCount += batch.length;
            process.stdout.write(`⏳ Procesando: ${Math.min(i + BATCH_SIZE, productsToUpdate.length)}/${productsToUpdate.length}\r`);
        }
    }

    console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
    console.log(`🏁 Sincronización finalizada.`);
    console.log(`✅ Éxitos: ${successCount}`);
    console.log(`❌ Fallidos: ${failCount}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
}

syncATCData().catch(err => {
    console.error('💥 Error fatal:', err);
});
