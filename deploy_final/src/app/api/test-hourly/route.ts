import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        // First, try to add the constraint if it doesn't exist
        // We'll do this by checking if we can insert duplicate then rollback

        // Drop the old constraint if exists and recreate
        const { error: dropError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE hourly_sales DROP CONSTRAINT IF EXISTS hourly_sales_product_id_hour_bucket_key;
                ALTER TABLE hourly_sales ADD CONSTRAINT hourly_sales_product_id_hour_bucket_key 
                    UNIQUE (product_id, hour_bucket);
            `
        });

        if (dropError) {
            // RPC might not exist, let's just test if we can insert
            console.log('RPC not available, testing with direct insert');
        }

        // Test insert
        const testData = {
            product_id: 'test_product_123',
            sales_count: 100,
            stores_count: 50,
            hour_bucket: new Date().toISOString(),
            recorded_at: new Date().toISOString()
        };

        const { data: insertData, error: insertError } = await supabase
            .from('hourly_sales')
            .insert(testData)
            .select();

        if (insertError) {
            return NextResponse.json({
                success: false,
                error: insertError.message,
                hint: insertError.hint,
                details: insertError.details
            });
        }

        // Delete test record
        await supabase
            .from('hourly_sales')
            .delete()
            .eq('product_id', 'test_product_123');

        return NextResponse.json({
            success: true,
            message: 'Table is working. Test insert succeeded.',
            testData: insertData
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
