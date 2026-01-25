import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST() {
    const results: string[] = [];

    try {
        console.log('🚀 Ejecutando migración multi-ciudad...');
        results.push('Iniciando migración...');

        // 1. Verificar/Crear tabla sucursales insertando datos
        // (Si la tabla no existe, Supabase RLS puede bloquear, pero intentamos)
        const cities = [
            { name: 'Caracas Centro', city: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
            { name: 'Maracaibo Centro', city: 'Maracaibo', latitude: 10.6666, longitude: -71.6124 },
            { name: 'Valencia Centro', city: 'Valencia', latitude: 10.1579, longitude: -67.9972 },
            { name: 'Barquisimeto Centro', city: 'Barquisimeto', latitude: 10.0678, longitude: -69.3474 },
            { name: 'Maracay Centro', city: 'Maracay', latitude: 10.2469, longitude: -67.5958 },
            { name: 'Puerto La Cruz Centro', city: 'Puerto La Cruz', latitude: 10.2146, longitude: -64.6297 }
        ];

        // Test if sucursales table exists
        const { data: sucursalesCheck, error: sucursalesCheckError } = await supabase
            .from('sucursales')
            .select('count')
            .limit(1);

        if (sucursalesCheckError) {
            results.push(`⚠️ Tabla 'sucursales' no existe. Error: ${sucursalesCheckError.message}`);
            results.push('📋 Por favor crea la tabla en Supabase SQL Editor');
        } else {
            results.push('✅ Tabla sucursales existe');

            // Insert cities
            const { error: insertError } = await supabase
                .from('sucursales')
                .upsert(cities, { onConflict: 'name' });

            if (insertError) {
                results.push(`⚠️ Error insertando ciudades: ${insertError.message}`);
            } else {
                results.push('✅ Ciudades insertadas/actualizadas');
            }
        }

        // 2. Test if stock_history table exists
        const { data: stockCheck, error: stockCheckError } = await supabase
            .from('stock_history')
            .select('count')
            .limit(1);

        if (stockCheckError) {
            results.push(`⚠️ Tabla 'stock_history' no existe. Error: ${stockCheckError.message}`);
            results.push('📋 Por favor crea la tabla en Supabase SQL Editor');
        } else {
            results.push('✅ Tabla stock_history existe');
        }

        // 3. Verificar datos existentes
        const { data: sucursalesData } = await supabase
            .from('sucursales')
            .select('*');

        const { data: stockData } = await supabase
            .from('stock_history')
            .select('*')
            .limit(10);

        return NextResponse.json({
            success: true,
            logs: results,
            tables: {
                sucursales: {
                    exists: !sucursalesCheckError,
                    count: sucursalesData?.length || 0
                },
                stock_history: {
                    exists: !stockCheckError,
                    count: stockData?.length || 0
                }
            },
            next_step: (sucursalesCheckError || stockCheckError)
                ? 'Ejecuta archivos/migration_multi_city.sql en Supabase SQL Editor'
                : 'Tablas listas! Puedes usar /api/scrape-stock'
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            logs: results,
            error: error.message
        }, { status: 500 });
    }
}
