/**
 * 🔍 PRODUCT GAP ANALYSIS SCRIPT
 * Compares products in Farmatodo_Reverse dataset with Supabase DB
 * to find missing Venezuelan pharmaceutical products.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjE0MDcsImV4cCI6MjA4MzgzNzQwN30.ccIewEgM8geAq09BYq5Zg7TVNROJRixzpB8Wo5GcNuE';

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function getSupabaseProductIds() {
    const ids = new Set();
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('products')
            .select('id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('❌ Error obteniendo IDs de Supabase:', error);
            break;
        }

        if (!data || data.length === 0) break;

        data.forEach(p => ids.add(p.id));
        page++;

        if (data.length < pageSize) break;
    }

    console.log(`🗄️  Encontrados ${ids.size} productos en Supabase`);
    return ids;
}

async function countProductsWithoutActiveIngredient() {
    const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .or('active_ingredient.is.null,active_ingredient.eq.');

    if (error) {
        console.error('Error contando productos sin ingrediente activo:', error);
        return 0;
    }

    return count || 0;
}

async function runGapAnalysis() {
    console.log('🚀 Iniciando análisis de brecha de productos...\n');

    // Load both datasets
    const reverseProducts = await loadReverseData();
    const supabaseIds = await getSupabaseProductIds();

    if (reverseProducts.length === 0) {
        console.error('No se pudieron cargar productos del dataset Reverse');
        return null;
    }

    // Filter to pharma-only products (those with principio_activo or in pharma categories)
    const pharmaCategories = [
        'medicamentos', 'farmacia', 'salud', 'cuidado personal',
        'vitaminas', 'suplementos', 'dermatológico', 'belleza'
    ];

    const pharmaProducts = reverseProducts.filter(p =>
        (p.principio_activo && p.principio_activo.trim() !== '') ||
        (p.categoria && pharmaCategories.some(c => p.categoria.toLowerCase().includes(c)))
    );

    console.log(`💊 Productos farmacéuticos en dataset: ${pharmaProducts.length}`);

    // Find missing products
    const missingProducts = [];
    let matchingCount = 0;

    for (const product of pharmaProducts) {
        if (supabaseIds.has(product.id)) {
            matchingCount++;
        } else {
            missingProducts.push(product);
        }
    }

    // Count missing by lab
    const labCounts = {};
    missingProducts.forEach(p => {
        const lab = p.laboratorio || 'Desconocido';
        labCounts[lab] = (labCounts[lab] || 0) + 1;
    });

    // Sort labs by count
    const sortedLabs = Object.entries(labCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

    const withoutActiveIngredient = await countProductsWithoutActiveIngredient();

    const report = {
        timestamp: new Date().toISOString(),
        supabase_total: supabaseIds.size,
        reverse_total: reverseProducts.length,
        reverse_pharma_only: pharmaProducts.length,
        matching_ids: matchingCount,
        missing_in_supabase: missingProducts.length,
        missing_products: missingProducts.slice(0, 100), // First 100 for review
        products_without_active_ingredient: withoutActiveIngredient,
        top_missing_labs: sortedLabs
    };

    return report;
}

async function main() {
    try {
        const report = await runGapAnalysis();

        if (!report) {
            console.error('No se pudo generar el reporte');
            return;
        }

        console.log('\n📊 ========== REPORTE DE BRECHA ==========\n');
        console.log(`📦 Productos en Supabase:           ${report.supabase_total}`);
        console.log(`📦 Productos en Reverse (total):    ${report.reverse_total}`);
        console.log(`💊 Productos Pharma en Reverse:     ${report.reverse_pharma_only}`);
        console.log(`✅ Coincidencias encontradas:       ${report.matching_ids}`);
        console.log(`❌ Faltantes en Supabase:           ${report.missing_in_supabase}`);
        console.log(`⚠️  Sin ingrediente activo en DB:   ${report.products_without_active_ingredient}`);

        console.log('\n🏭 Top 15 Labs con productos faltantes:');
        Object.entries(report.top_missing_labs).forEach(([lab, count], i) => {
            console.log(`   ${i + 1}. ${lab}: ${count}`);
        });

        // Save full report
        const reportPath = path.join(__dirname, 'gap_analysis_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Reporte guardado en: ${reportPath}`);

        // Calculate coverage
        const coverage = (report.matching_ids / report.reverse_pharma_only * 100).toFixed(2);
        console.log(`\n📈 Cobertura actual: ${coverage}%`);

        if (report.missing_in_supabase > 0) {
            console.log(`\n⚠️  ACCIÓN REQUERIDA: Sincronizar ${report.missing_in_supabase} productos faltantes`);
        }

    } catch (error) {
        console.error('❌ Error ejecutando análisis:', error);
    }
}

main();
