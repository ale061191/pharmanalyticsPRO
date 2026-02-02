const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('CHECKING STATUS...');

    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (products && products.length > 0) {
        console.log('LATEST_PRODUCT_UPDATE: ' + products[0].updated_at);
    } else {
        console.log('NO_PRODUCTS_FOUND');
    }

    const { data: sales, error: salesError } = await supabase
        .from('hourly_sales')
        .select('recorded_at')
        .order('recorded_at', { ascending: false })
        .limit(1);

    if (sales && sales.length > 0) {
        console.log('LATEST_HOURLY_SALES: ' + sales[0].recorded_at);
    } else {
        console.log('NO_SALES_FOUND');
    }
    // 2. Check Hourly Sales Snapshot
    // ... (keeping existing for context, though user said ignore it)

    // 3. Check Daily Sales Snapshot (The other daily candidate)
    const { data: dailySales, error: dailyError } = await supabase
        .from('sales_snapshot')
        .select('captured_at, snapshot_date')
        .order('captured_at', { ascending: false })
        .limit(1);

    if (dailyError) {
        if (dailyError.code === '42P01') {
            console.log('NO_DAILY_SALES_TABLE');
        } else {
            console.log('DAILY_SALES_ERROR: ' + dailyError.message);
        }
    } else if (dailySales && dailySales.length > 0) {
        console.log('LATEST_DAILY_SNAPSHOT: ' + dailySales[0].captured_at + ' (Date: ' + dailySales[0].snapshot_date + ')');
    } else {
        console.log('NO_DAILY_SNAPSHOTS_FOUND');
    }
}

checkStatus();
