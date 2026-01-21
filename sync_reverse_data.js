/**
 * 🔄 SYNC FARMATODO REVERSE DATA
 * Imports missing products and enriches existing ones with sales data
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjE0MDcsImV4cCI6MjA4MzgzNzQwN30.ccIewEgM8geAq09BYq5Zg7TVNROJRixzpB8Wo5GcNuE';

const supabase = createClient(supabaseUrl, supabaseKey);

// Stats
const stats = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0
};

async function loadReverseData() {
    const filePath = path.join(__dirname, 'Farmatodo_Reverse', 'FARMATODO_VE_PHARMA_FILTRADO.json');

    if (!fs.existsSync(filePath)) {
        console.error('❌ Archivo no encontrado:', filePath);
        return [];
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const products = JSON.parse(rawData);

    console.log(`📦 Cargados ${products.length} productos del dataset Reverse`);
    return products;
}

function mapReverseToSupabase(reverseProduct) {
    // Clean up price - convert from centavos to Bs
    const price = reverseProduct.precio_bs ? reverseProduct.precio_bs / 100 : 0;

    return {
        id: reverseProduct.id,
        name: reverseProduct.nombre?.trim() || 'Sin nombre',
        brand: reverseProduct.marca || reverseProduct.laboratorio || null,
        category: reverseProduct.categoria || 'Medicamentos',
        department: reverseProduct.subcategoria || 'Farmacia',
        image_url: reverseProduct.imagen_url || null,
        avg_price: price,
        original_price: price,
        active_ingredient: reverseProduct.principio_activo || null,
        barcode: reverseProduct.codigo_barras || null,
        sales: reverseProduct.ventas || 0,
        updated_at: new Date().toISOString()
    };
}

async function syncProducts(products) {
    console.log('\n🔄 Iniciando sincronización...\n');

    // Filter to only pharmaceutical products
    const pharmaCategories = [
        'medicamentos', 'farmacia', 'salud', 'vitaminas',
        'suplementos', 'droguería',
        'alivio del dolor', 'salud digestiva'
    ];

    const pharmaProducts = products.filter(p => {
        const cat = (p.categoria || '').toLowerCase();
        const subcat = (p.subcategoria || '').toLowerCase();
        return pharmaCategories.some(c => cat.includes(c) || subcat.includes(c)) ||
            (p.principio_activo && p.principio_activo.trim() !== '');
    });

    console.log(`💊 Productos farmacéuticos a sincronizar: ${pharmaProducts.length}`);

    // Process in batches
    const batchSize = 100;

    for (let i = 0; i < pharmaProducts.length; i += batchSize) {
        const batch = pharmaProducts.slice(i, i + batchSize);
        const mappedBatch = batch.map(mapReverseToSupabase);

        // Upsert the batch
        const { data, error } = await supabase
            .from('products')
            .upsert(mappedBatch, {
                onConflict: 'id',
                ignoreDuplicates: false
            });

        if (error) {
            console.error(`❌ Error en batch ${i / batchSize + 1}:`, error.message);
            stats.errors += batch.length;
        } else {
            stats.inserted += batch.length;
            process.stdout.write(`\r📊 Progreso: ${Math.min(i + batchSize, pharmaProducts.length)}/${pharmaProducts.length}`);
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n');
}

async function updateExistingWithSales() {
    console.log('📈 Actualizando productos existentes con datos de ventas...\n');

    // Load all reverse products
    const reverseProducts = await loadReverseData();

    // Create a map by barcode for quick lookup
    const barcodeMap = new Map();
    reverseProducts.forEach(p => {
        if (p.codigo_barras) {
            barcodeMap.set(p.codigo_barras, p);
        }
    });

    console.log(`🔗 Productos con código de barras para matching: ${barcodeMap.size}`);

    // Get products from Supabase that have barcodes
    const { data: existingProducts, error } = await supabase
        .from('products')
        .select('id, name, barcode, sales, active_ingredient')
        .not('barcode', 'is', null);

    if (error) {
        console.error('Error obteniendo productos existentes:', error);
        return;
    }

    console.log(`📋 Productos existentes con barcode: ${existingProducts?.length || 0}`);

    // Update products that match by barcode
    let updated = 0;
    for (const product of existingProducts || []) {
        const reverseMatch = barcodeMap.get(product.barcode);
        if (reverseMatch && reverseMatch.ventas > 0) {
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    sales: reverseMatch.ventas,
                    active_ingredient: product.active_ingredient || reverseMatch.principio_activo || null
                })
                .eq('id', product.id);

            if (!updateError) {
                updated++;
            }
        }
    }

    console.log(`✅ Productos actualizados con ventas: ${updated}`);
    stats.updated = updated;
}

async function copyDocumentation() {
    console.log('\n📚 Copiando documentación...');

    const sourcePath = path.join(__dirname, 'Farmatodo_Reverse', 'ALGOLIA_DATA_GUIDE.md');
    const destPath = path.join(__dirname, 'master', 'ALGOLIA_DATA_GUIDE.md');

    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log('✅ ALGOLIA_DATA_GUIDE.md copiado a master/');
    }
}

async function main() {
    try {
        console.log('🚀 ========== SYNC FARMATODO REVERSE DATA ==========\n');

        // Load data
        const reverseProducts = await loadReverseData();

        if (reverseProducts.length === 0) {
            console.error('No se encontraron productos para sincronizar');
            return;
        }

        // Sync products
        await syncProducts(reverseProducts);

        // Update existing products with sales data
        await updateExistingWithSales();

        // Copy documentation
        await copyDocumentation();

        // Print summary
        console.log('\n📊 ========== RESUMEN ==========');
        console.log(`✅ Productos insertados/actualizados: ${stats.inserted}`);
        console.log(`📈 Productos enriquecidos con ventas: ${stats.updated}`);
        console.log(`❌ Errores: ${stats.errors}`);

        // Verify final counts
        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        console.log(`\n📦 Total productos en BD: ${count}`);

    } catch (error) {
        console.error('❌ Error fatal:', error);
    }
}

main();
