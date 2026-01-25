import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        // Create the hourly_sales table for tracking intraday sales
        const { error } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS hourly_sales (
                    id SERIAL PRIMARY KEY,
                    product_id TEXT NOT NULL,
                    sales_count INTEGER NOT NULL,
                    stores_count INTEGER DEFAULT 0,
                    recorded_at TIMESTAMPTZ DEFAULT NOW(),
                    hour_bucket TIMESTAMPTZ NOT NULL,
                    UNIQUE(product_id, hour_bucket)
                );
                
                CREATE INDEX IF NOT EXISTS idx_hourly_sales_product_date 
                ON hourly_sales(product_id, hour_bucket DESC);
                
                CREATE INDEX IF NOT EXISTS idx_hourly_sales_recorded 
                ON hourly_sales(recorded_at DESC);
            `
        });

        if (error) {
            // If RPC doesn't exist, try direct table creation
            const { error: createError } = await supabase
                .from('hourly_sales')
                .select('id')
                .limit(1);

            if (createError && createError.code === '42P01') {
                // Table doesn't exist - return instructions
                return NextResponse.json({
                    success: false,
                    message: 'Please run this SQL in Supabase Dashboard:',
                    sql: `
CREATE TABLE hourly_sales (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL,
    sales_count INTEGER NOT NULL,
    stores_count INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    hour_bucket TIMESTAMPTZ NOT NULL,
    UNIQUE(product_id, hour_bucket)
);

CREATE INDEX idx_hourly_sales_product_date ON hourly_sales(product_id, hour_bucket DESC);
CREATE INDEX idx_hourly_sales_recorded ON hourly_sales(recorded_at DESC);
                    `
                });
            }

            return NextResponse.json({ success: true, message: 'Table already exists' });
        }

        return NextResponse.json({ success: true, message: 'Migration completed' });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
