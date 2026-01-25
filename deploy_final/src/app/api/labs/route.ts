import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Force dynamic re-evaluation
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Get unique labs from products
        // We fetch all non-null lab_names
        const { data, error } = await supabase
            .from('products')
            .select('lab_name')
            .not('lab_name', 'is', null);

        if (error) throw error;

        // Deduplicate and sort
        const uniqueLabs = Array.from(new Set(data.map((item: any) => item.lab_name))).sort();

        return NextResponse.json({ labs: uniqueLabs });
    } catch (error: any) {
        console.error('Error fetching labs:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
