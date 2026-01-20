
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Supabase Init
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function refresh() {
    console.log("🚀 Starting Analytics Motor Recalculation...");
    const startTime = Date.now();

    try {
        const { error } = await supabase.rpc('refresh_product_performance');

        if (error) {
            console.error("❌ Error refreshing performance table:", error.message);
            process.exit(1);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Success! Dashboard metrics pre-calculated in ${duration}s.`);
        console.log("✨ Dashboard is now serving the latest performance data instantly.");

    } catch (err) {
        console.error("🔥 Critical fatal error during refresh:", err.message);
        process.exit(1);
    }
}

refresh();
