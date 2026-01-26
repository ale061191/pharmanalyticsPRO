
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cache configuration
export const revalidate = 3600; // Revalidate every hour

const ATC_GROUPS: Record<string, string> = {
    'A': 'Alimentario y Metabólico',
    'B': 'Sangre y Hematopoyéticos',
    'C': 'Sistema Cardiovascular',
    'D': 'Dermatológicos',
    'G': 'Sistema Genitourinario',
    'H': 'Hormonas Sistémicas',
    'J': 'Antiinfecciosos Sistémicos',
    'L': 'Antineoplásicos',
    'M': 'Musculoesquelético',
    'N': 'Sistema Nervioso',
    'P': 'Antiparasitarios',
    'R': 'Sistema Respiratorio',
    'S': 'Órganos de los Sentidos',
    'V': 'Varios'
};

export async function GET() {
    try {
        // Fetch product ATC codes using a lightweight query
        const { data: products, error } = await supabase
            .from('products')
            .select('atc_code')
            .not('atc_code', 'is', null);

        if (error) throw error;

        // Process aggregations in memory (faster for <10k records than complex SQL GROUP BY on text substring)
        const distribution: Record<string, number> = {};
        let totalWithAtc = 0;

        products.forEach(p => {
            if (p.atc_code && p.atc_code.length > 0) {
                const letter = p.atc_code.charAt(0).toUpperCase();
                if (/[A-Z]/.test(letter)) {
                    distribution[letter] = (distribution[letter] || 0) + 1;
                    totalWithAtc++;
                }
            }
        });

        // Format for Recharts
        const chartData = Object.entries(distribution)
            .map(([letter, count]) => ({
                code: letter,
                name: ATC_GROUPS[letter] || `Grupo ${letter}`,
                count: count,
                percentage: ((count / totalWithAtc) * 100).toFixed(1)
            }))
            .sort((a, b) => b.count - a.count); // Sort by prevalence

        return NextResponse.json({
            success: true,
            total_analyzed: totalWithAtc,
            data: chartData
        });

    } catch (err: any) {
        console.error('ATC Analytics Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
