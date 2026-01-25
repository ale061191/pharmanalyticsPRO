import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const { product_name, mode = 'price' } = await request.json();

        if (!product_name) {
            return NextResponse.json({ error: 'product_name is required' }, { status: 400 });
        }

        if (mode === 'stock') {
            // === STOCK TRENDS & SALES ESTIMATION ===
            return await getStockTrends(product_name);
        } else {
            // === PRICE TRENDS (Original) ===
            return await getPriceTrends(product_name);
        }

    } catch (e: any) {
        console.error('Calc trends error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function getStockTrends(productName: string) {
    // Fetch stock history for this product across all cities
    const { data: history, error } = await supabase
        .from('stock_history')
        .select('*')
        .eq('product_name', productName)
        .order('scraped_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({
            data: generateMockStockData(),
            source: 'mock_fallback'
        });
    }

    if (!history || history.length === 0) {
        return NextResponse.json({
            data: generateMockStockData(), // Keep metrics mock
            chart_data: generateMockStockHistory(), // Add chart history mock
            source: 'mock_empty_db'
        });
    }

    // Group by city and calculate changes
    const cityData: Record<string, any[]> = {};
    history.forEach((entry: any) => {
        if (!cityData[entry.city]) {
            cityData[entry.city] = [];
        }
        cityData[entry.city].push(entry);
    });

    // Calculate sales estimates per city
    const salesByCity = Object.entries(cityData).map(([city, entries]) => {
        // Sort by date descending
        entries.sort((a, b) => new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime());

        const current = entries[0];
        const previous = entries.length > 1 ? entries[1] : null;

        const salesEstimate = previous
            ? Math.max(0, previous.stock_count - current.stock_count)
            : 0;

        return {
            city,
            current_stock: current.stock_count,
            previous_stock: previous?.stock_count || current.stock_count,
            sales_estimate: salesEstimate,
            last_updated: current.scraped_at
        };
    });

    // Total metrics
    const totalCurrentStock = salesByCity.reduce((sum, c) => sum + c.current_stock, 0);
    const totalSalesEstimate = salesByCity.reduce((sum, c) => sum + c.sales_estimate, 0);

    // Chart data: aggregate stock over time
    const chartData = history
        .slice(0, 30)
        .map((entry: any) => ({
            date: new Date(entry.scraped_at).toLocaleDateString('es-VE'),
            city: entry.city,
            stock: entry.stock_count
        }));

    return NextResponse.json({
        product_name: productName,
        by_city: salesByCity,
        summary: {
            total_current_stock: totalCurrentStock,
            total_sales_estimate: totalSalesEstimate,
            cities_tracked: salesByCity.length,
            precision_disclaimer: '80-90% (inferido de depleción de stock)'
        },
        chart_data: chartData,
        source: 'database'
    });
}

async function getPriceTrends(productName: string) {
    // Original price history logic
    const { data: history, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_name', productName)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Supabase Error:", error);
        return NextResponse.json({
            data: generateMockPriceHistory(),
            source: 'mock_fallback'
        });
    }

    if (!history || history.length === 0) {
        return NextResponse.json({
            data: generateMockPriceHistory(),
            source: 'mock_empty_db'
        });
    }

    // Calculate Trends
    const latest = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : latest;

    const priceChange = ((latest.price - previous.price) / previous.price) * 100;
    const trendDirection = priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'stable';

    // Format for Recharts
    const chartData = history.map((entry: any) => ({
        day: new Date(entry.created_at).toLocaleDateString('es-VE', { weekday: 'short' }),
        date: new Date(entry.created_at).toLocaleDateString('es-VE'),
        price: entry.price
    }));

    return NextResponse.json({
        data: chartData,
        analysis: {
            current_price: latest.price,
            change_percent: priceChange.toFixed(2),
            trend: trendDirection
        },
        source: 'database'
    });
}

// Mock data generators for development
// Generate a realistic 7-day stock history
function generateMockStockHistory() {
    const history = [];
    const today = new Date();
    let currentStock = Math.floor(Math.random() * 50) + 20; // Start with 20-70

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);

        // Simulate depletion: Stock tends to go down, with occasional restock
        const change = Math.floor(Math.random() * 5); // 0-4 sales
        const restock = Math.random() > 0.8 ? 20 : 0; // 20% chance of restock

        currentStock = Math.max(0, currentStock - change + restock);

        history.push({
            date: d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
            stock: currentStock
        });
    }
    return history;
}

function generateMockStockData() {
    const cities = ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto'];
    return cities.map(city => ({
        city,
        current_stock: Math.floor(Math.random() * 50) + 10,
        previous_stock: Math.floor(Math.random() * 60) + 20,
        sales_estimate: Math.floor(Math.random() * 15),
        last_updated: new Date().toISOString()
    }));
}

function generateMockPriceHistory() {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return {
            day: d.toLocaleDateString('es-VE', { weekday: 'short' }),
            date: d.toLocaleDateString('es-VE'),
            price: 100 + Math.random() * 20 - 10
        };
    });
}
