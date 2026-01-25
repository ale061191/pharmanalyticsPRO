
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Access server-side keys
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        console.log('[Admin] Clearing hourly_sales table...');
        const { error } = await supabase
            .from('hourly_sales')
            .delete()
            .neq('id', 0); // Delete all

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Data cleared' });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
