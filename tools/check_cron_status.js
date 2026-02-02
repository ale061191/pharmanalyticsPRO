const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbxdfegsrjnqskpwlhri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGRmZWdzcmpucXNrcHdsaHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MTQwNywiZXhwIjoyMDgzODM3NDA3fQ.GHBTSxPH9-el6aA2T6QaU1qbsfYPANNiBJzjXBQKW3Y';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('🔍 Checking Cron Job Status...\n');

    // 1. Check Products Last Update
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('updated_at, id, name')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (prodError) {
        console.error('❌ Error fetching products:', prodError.message);
    } else {
        console.log('📦 Latest Product Updates (Global Sync / Resync):');
        if (products && products.length > 0) {
            products.forEach(p => {
                const timeAgo = (new Date() - new Date(p.updated_at)) / 1000 / 60; // minutes
                const hoursAgo = timeAgo / 60;
                console.log(`   - ${p.name ? p.name.substring(0, 30) : p.id}... : ${p.updated_at} (${timeAgo.toFixed(1)} mins ago / ${hoursAgo.toFixed(1)} hours ago)`);
            });
        } else {
            console.log('   No products found.');
        }
    }

    // 2. Check Hourly Sales Snapshot
    // Using recorded_at and hour_bucket
    const { data: sales, error: salesError } = await supabase
        .from('hourly_sales')
        .select('recorded_at, product_id, hour_bucket')
        .order('recorded_at', { ascending: false })
        .limit(5);

    if (salesError) {
        if (salesError.code === '42P01') {
            console.log('\n❌ Table hourly_sales does not exist.');
        } else {
            console.error('\n❌ Error fetching hourly_sales:', salesError.message);
        }
    } else {
        console.log('\n📈 Latest Hourly Sales Snapshots:');
        if (sales && sales.length > 0) {
            sales.forEach(s => {
                const timeAgo = (new Date() - new Date(s.recorded_at)) / 1000 / 60; // minutes
                const hoursAgo = timeAgo / 60;
                console.log(`   - Product ID ${s.product_id} : ${s.recorded_at} (${timeAgo.toFixed(1)} mins ago / ${hoursAgo.toFixed(1)} hours ago)`);
                console.log(`     Bucket: ${s.hour_bucket}`);
            });
        } else {
            console.log('   No hourly sales records found.');
        }
    }
}

checkStatus();
