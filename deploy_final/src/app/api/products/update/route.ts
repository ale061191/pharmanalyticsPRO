
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, clean_name, presentation, concentration } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('products')
            .update({
                clean_name,
                presentation,
                concentration
            })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Update Product Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
