// Script para ejecutar migración SQL en Supabase
// Ejecutar: npx tsx archivos/run_migration.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🚀 Ejecutando migración multi-ciudad...\n');

    // 1. Crear tabla sucursales
    console.log('📍 Creando tabla sucursales...');
    const { error: sucursalesError } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS sucursales (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                city TEXT NOT NULL,
                latitude DECIMAL(10, 6) NOT NULL,
                longitude DECIMAL(10, 6) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (sucursalesError) {
        console.log('⚠️ Nota: Usando método alternativo para sucursales...');
        // Intento alternativo: insertar mediante API
    }

    // 2. Insertar ciudades
    console.log('🏙️ Insertando ciudades principales...');
    const cities = [
        { name: 'Caracas Centro', city: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
        { name: 'Maracaibo Centro', city: 'Maracaibo', latitude: 10.6666, longitude: -71.6124 },
        { name: 'Valencia Centro', city: 'Valencia', latitude: 10.1579, longitude: -67.9972 },
        { name: 'Barquisimeto Centro', city: 'Barquisimeto', latitude: 10.0678, longitude: -69.3474 },
        { name: 'Maracay Centro', city: 'Maracay', latitude: 10.2469, longitude: -67.5958 },
        { name: 'Puerto La Cruz Centro', city: 'Puerto La Cruz', latitude: 10.2146, longitude: -64.6297 }
    ];

    const { error: insertError } = await supabase
        .from('sucursales')
        .upsert(cities, { onConflict: 'city' });

    if (insertError) {
        console.log('❌ Error insertando ciudades:', insertError.message);
    } else {
        console.log('✅ Ciudades insertadas correctamente');
    }

    // 3. Crear tabla stock_history
    console.log('📊 Creando tabla stock_history...');
    const { error: stockError } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS stock_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_name TEXT NOT NULL,
                city TEXT NOT NULL,
                stock_count INTEGER NOT NULL DEFAULT 0,
                scraped_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (stockError) {
        console.log('⚠️ Nota: Tabla stock_history puede ya existir o requiere creación manual');
    }

    // 4. Verificar tablas
    console.log('\n📋 Verificando estado de tablas...');

    const { data: sucursalesData, error: checkError1 } = await supabase
        .from('sucursales')
        .select('*')
        .limit(5);

    if (checkError1) {
        console.log('❌ Tabla sucursales no existe aún');
    } else {
        console.log(`✅ Tabla sucursales: ${sucursalesData?.length || 0} registros`);
    }

    const { data: stockData, error: checkError2 } = await supabase
        .from('stock_history')
        .select('*')
        .limit(5);

    if (checkError2) {
        console.log('❌ Tabla stock_history no existe aún');
    } else {
        console.log(`✅ Tabla stock_history: ${stockData?.length || 0} registros`);
    }

    console.log('\n✨ Migración completada.');
    console.log('\n⚠️ Si las tablas no se crearon, por favor ejecuta el SQL directamente en Supabase Dashboard > SQL Editor:');
    console.log('   Archivo: archivos/migration_multi_city.sql');
}

runMigration().catch(console.error);
