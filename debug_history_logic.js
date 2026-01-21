const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debugHistory(productId) {
    console.log(`🐞 Debugging History for Product: ${productId}`);

    // Fetch raw history
    const { data: history, error } = await supabase
        .from('stock_history')
        .select('stock_count, snapshot_date')
        .eq('product_id', productId)
        .order('snapshot_date', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${history.length} history records.`);

    // Group by Date
    const groupedByDate = {};

    history.forEach(record => {
        const date = record.snapshot_date;
        if (date) {
            groupedByDate[date] = (groupedByDate[date] || 0) + record.stock_count;
        }
    });

    // Convert to array and calculate sales
    const timeline = Object.keys(groupedByDate).sort().map(date => ({
        date,
        stock: groupedByDate[date]
    }));

    // Calculate Estimated Sales
    let cumulativeSales = 0;
    const enrichedTimeline = timeline.map((day, index) => {
        let dailySales = 0;
        if (index > 0) {
            const prevStock = timeline[index - 1].stock;
            const diff = prevStock - day.stock;
            if (diff > 0) {
                dailySales = diff;
            }
        }
        cumulativeSales += dailySales;

        return {
            ...day,
            sales: dailySales,
            cumulative_sales: cumulativeSales
        };
    });

    console.table(enrichedTimeline);
    console.log('Total Estimated Sales:', cumulativeSales);
}

// Uses Ibuprofeno ID from previous steps
debugHistory('113354489');
