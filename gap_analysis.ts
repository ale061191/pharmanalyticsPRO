/**
 * 🔍 PRODUCT GAP ANALYSIS SCRIPT
 * Compares products in Farmatodo_Reverse dataset with Supabase DB
 * to find missing Venezuelan pharmaceutical products.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

interface ReverseProduct {
    id: string;
    codigo_barras?: string;
    nombre: string;
    laboratorio?: string;
    marca?: string;
    principio_activo?: string;
    requiere_receta?: boolean;
    es_generico?: boolean;
    categoria?: string;
    subcategoria?: string;
}

interface GapReport {
    timestamp: string;
    supabase_total: number;
    reverse_total: number;
    reverse_pharma_only: number;
    matching_ids: number;
    missing_in_supabase: number;
    missing_products: ReverseProduct[];
    products_without_active_ingredient: number;
    top_missing_labs: Record<string, number>;
}

async function loadReverseData(): Promise<ReverseProduct[]> {
    const filePath = path.join(__dirname, 'Farmatodo_Reverse', 'FARMATODO_VE_PHARMA_FILTRADO.json');

    if (!fs.existsSync(filePath)) {
        console.error('❌ Archivo no encontrado:', filePath);
        return [];
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const products: ReverseProduct[] = JSON.parse(rawData);

    console.log(`📦 Cargados ${products.length} productos del dataset Reverse`);
    return products;
}

async function getSupabaseProductIds(): Promise<Set<string>> {
    const ids = new Set<string>();
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

async function countProductsWithoutActiveIngredient(): Promise<number> {
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

async function runGapAnalysis(): Promise<GapReport> {
    console.log('🚀 Iniciando análisis de brecha de productos...\n');

    // Load both datasets
    const reverseProducts = await loadReverseData();
    const supabaseIds = await getSupabaseProductIds();

    // Filter to pharma-only products (those with principio_activo or in pharma categories)
    const pharmaCategories = [
        'medicamentos', 'farmacia', 'salud', 'cuidado personal',
        'vitaminas', 'suplementos', 'dermatológico'
    ];

    const pharmaProdcuts = reverseProducts.filter(p =>
        (p.principio_activo && p.principio_activo.trim() !== '') ||
        (p.categoria && pharmaCategories.some(c => p.categoria!.toLowerCase().includes(c)))
    );

    console.log(`💊 Productos farmacéuticos en dataset: ${pharmaProdcuts.length}`);

    // Find missing products
    const missingProducts: ReverseProduct[] = [];
    const matchingCount = { count: 0 };

    for (const product of pharmaProdcuts) {
        if (supabaseIds.has(product.id)) {
            matchingCount.count++;
        } else {
            missingProducts.push(product);
        }
    }

    // Count missing by lab
    const labCounts: Record<string, number> = {};
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

    const report: GapReport = {
        timestamp: new Date().toISOString(),
        supabase_total: supabaseIds.size,
        reverse_total: reverseProducts.length,
        reverse_pharma_only: pharmaProdcuts.length,
        matching_ids: matchingCount.count,
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
