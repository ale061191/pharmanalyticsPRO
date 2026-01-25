'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
    ArrowLeft, RefreshCw, TrendingUp, Package, Zap, Building2, FileCode, CheckCircle2, Award
} from 'lucide-react';
import Link from 'next/link';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    PieChart, Pie, Cell
} from 'recharts';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Interfaces
interface StoreData {
    name: string;
    address: string;
    stock_count: number;
    availability_status: 'high' | 'medium' | 'low' | 'none';
}

interface SectorData {
    sector: string;
    stores: StoreData[];
}

interface CityDetailData {
    city: string;
    sectors: SectorData[];
    total_stock: number;
}

interface CityStockData {
    city: string;
    status: 'High' | 'Medium' | 'Low';
    count: number;
}

const VENEZUELA_CITIES = [
    'Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Barcelona', 'Ciudad Guayana', 'Maturín',
    'Barinas', 'Puerto La Cruz', 'Mérida', 'San Cristóbal', 'Cumaná', 'Acarigua', 'Cabimas', 'Coro',
    'El Tigre', 'Ciudad Bolívar', 'Los Teques', 'Guarenas', 'Guatire', 'Valera', 'Punto Fijo', 'Turmero',
    'San Francisco', 'Santa Rita', 'Puerto Cabello', 'Valle de la Pascua', 'San Felipe', 'San Juan de los Morros',
    'Carúpano', 'Ejido', 'Catia La Mar', 'Quíbor', 'Araure', 'Calabozo', 'Ciudad Ojeda', 'Palo Negro',
    'Anaco', 'San Carlos', 'Guanare', 'La Victoria', 'Carora', 'San Fernando de Apure', 'Ocumare del Tuy',
    'Cúa', 'Villa de Cura', 'Guasdualito', 'Zaraza', 'Tucupita', 'Puerto Ayacucho', 'Trujillo', 'San José de Guanipa',
    'Upata', 'Machiques', 'La Grita'
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const salesValue = data.cumulative_sales;
        const delta = data.delta;
        const velocityStatus = data.velocity_status; // high, moderate, low

        // Determine delta color and icon
        let deltaColor = "text-slate-400";
        let deltaIcon = "•";
        if (delta > 0) {
            deltaColor = "text-emerald-500";
            deltaIcon = "↑";
        }

        // Determine velocity label
        let velocityLabel = "Estable";
        let velocityColor = "text-slate-400";
        if (velocityStatus === 'high') {
            velocityLabel = "Acelerado 🔥";
            velocityColor = "text-amber-500";
        } else if (velocityStatus === 'moderate') {
            velocityLabel = "Activo ⚡";
            velocityColor = "text-blue-500";
        }

        return (
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] min-w-[200px]">
                <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        {label}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${velocityColor}`}>
                        {velocityLabel}
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                            <span className="text-xs font-bold text-slate-600">Acumulado</span>
                        </div>
                        <span className="text-lg font-black text-blue-600 font-mono">
                            {salesValue?.toLocaleString() || 0}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 bg-slate-50 p-2 rounded-lg">
                        <span className="text-xs font-bold text-slate-500">Movimiento Hora</span>
                        <div className={`flex items-center gap-1 font-mono font-bold ${deltaColor}`}>
                            <span className="text-[10px]">{deltaIcon}</span>
                            <span className="text-sm">{delta > 0 ? `+${delta}` : '0'}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function ProductDetail() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    // 0 = LIVE mode (real-time), >0 = historical mode (days)
    const [period, setPeriod] = useState(0);

    const [marketData, setMarketData] = useState<any>(null);

    const [algoliaMetrics, setAlgoliaMetrics] = useState({
        totalStores: 204,
        availableStores: 0,
        coveragePercent: 0,
        salesVelocity: 'Calculando...',
        stockRotation: 'Calculando...',
        price: 0
    });



    useEffect(() => {
        async function fetchProductData() {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (data) {
                    setProduct({
                        ...data,
                        price: data.avg_price,
                        image: data.image_url,
                        stock_count: data.stock_count || 0,
                        active_ingredient: data.active_ingredient,
                        category: data.category || 'Salud',
                        clean_name: data.clean_name
                    });

                    // Load appropriate data based on mode
                    if (period === 0) {
                        // Will be handled by the period useEffect
                    } else {
                        fetchHistory(data.id, period);
                    }
                    fetchLiveStats(data.id, period === 0);
                }
            } catch (e) {
                console.error("Error loading product", e);
            } finally {
                setLoading(false);
            }
        }
        fetchProductData();
    }, [params.id]);

    useEffect(() => {
        if (product?.id) {
            if (period === 0) {
                // LIVE mode: fetch intraday hourly trend
                fetchIntradayTrend(product.id);
            } else {
                // Historical mode: fetch daily history
                fetchHistory(product.id, period);
            }
        }
    }, [period, product?.id]);

    async function fetchIntradayTrend(productId: string) {
        try {
            const res = await fetch(`/api/products/${productId}/intraday`);
            const json = await res.json();
            if (json.success && json.trend) {
                setChartData(json.trend.map((d: any) => ({
                    formattedDate: d.hour,
                    cumulative_sales: d.sales,
                    stock: d.stores,
                    delta: d.delta,
                    velocity_status: d.velocity_status
                })));

                // Update metrics with real intraday calculations
                if (json.metrics) {
                    const trendIcon = json.metrics.trend === 'accelerating' ? '🔥'
                        : (json.metrics.trend === 'decelerating' ? '📉' : '⚡');

                    // Format trend text nicely
                    const trendLabel = json.metrics.trend === 'accelerating' ? 'ALZA'
                        : (json.metrics.trend === 'decelerating' ? 'BAJA' : 'ESTABLE');

                    setAlgoliaMetrics(prev => ({
                        ...prev,
                        availableStores: json.currentStores,
                        coveragePercent: Math.round((json.currentStores / 204) * 100),
                        // Show hourly velocity instead of monthly static
                        salesVelocity: `${json.metrics.velocity} unids/h`,
                        // Show trend status in rotation card for now
                        stockRotation: `${trendLabel} ${trendIcon}`
                    }));

                    // Save full market data for advanced display
                    setMarketData(json);
                }
            }
        } catch (e) {
            console.error("Error fetching intraday trend", e);
        }
    }

    async function fetchHistory(productId: string, days: number) {
        try {
            const res = await fetch(`/api/products/${productId}/history?days=${days}`);
            const json = await res.json();
            if (json.history) {
                setChartData(json.history.map((d: any) => ({
                    ...d,
                    formattedDate: new Date(d.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
                    delta: d.sales_count || 0, // Ensure delta exists for history view (using daily sales)
                    cumulative_sales: d.accumulated_sales || d.sales_count // Fallback for tooltip
                })));
            }
        } catch (e) {
            console.error("Error fetching history", e);
        }
    }

    async function fetchLiveStats(productId: string, isLiveMode: boolean = false) {
        try {
            const res = await fetch(`/api/products/${productId}/live-stats`);
            const json = await res.json();

            if (json.success && json.stats.found) {
                const stats = json.stats;
                const totalStock = stats.total_stock;

                const monthlySales = stats.sales || 0;
                const dailySales = monthlySales / 30;
                const daysOfSupply = dailySales > 0 ? Math.round(totalStock / dailySales) : 999;

                const rotationLabel = daysOfSupply > 365 ? '> 365 días' : `${daysOfSupply} días`;

                setAlgoliaMetrics(prev => ({
                    totalStores: 204,
                    availableStores: stats.stores_with_stock,
                    coveragePercent: Math.round((stats.stores_with_stock / 204) * 100),
                    // If in LIVE mode, preserve the existing velocity (calculated by intraday), 
                    // otherwise show monthly average.
                    salesVelocity: isLiveMode ? prev.salesVelocity : (monthlySales > 0 ? `${monthlySales} unids/mes` : (totalStock < 50 ? 'Baja' : 'Media')),
                    stockRotation: monthlySales > 0 ? rotationLabel : (totalStock < 100 ? '< 15 días' : '30-45 días'),
                    price: stats.price || 0
                }));
            } else {
                // Not found implies 0 stock/sales
                setAlgoliaMetrics({
                    totalStores: 204,
                    availableStores: 0,
                    coveragePercent: 0,
                    salesVelocity: 'Baja',
                    stockRotation: 'Inactivo',
                    price: 0
                });
            }
        } catch (e) {
            console.error("Error fetching live stats", e);
        }
    }



    if (loading || !product) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }



    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-purple-100">
            <Navbar />

            <main className="w-full max-w-[95%] lg:max-w-[1800px] mx-auto px-4 md:px-8 py-8 md:py-12">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 group font-medium">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-purple-300 group-hover:bg-purple-50 transition-all shadow-sm">
                        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform text-slate-400 group-hover:text-purple-600" />
                    </div>
                    <span>Volver al Dashboard</span>
                </Link>

                {/* Product Header Card */}
                <div className="flex flex-col lg:flex-row gap-6 mb-8 items-stretch">
                    {/* Image Section */}
                    <div className="w-full lg:w-[280px] glass-panel p-8 rounded-2xl flex items-center justify-center group transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                        {product.image ? (
                            <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <Package size={80} className="text-slate-100" />
                        )}
                    </div>

                    {/* Basic Info Section */}
                    {/* Basic Info Section */}
                    <div className="flex-1 glass-panel p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group/panel">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 transition-opacity duration-700 group-hover/panel:opacity-75"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-blue-50 text-blue-600 uppercase tracking-widest border border-blue-100/50">
                                    {product.category || 'MEDICAMENTOS'}
                                </span>
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/80 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100/50">
                                    <Zap size={10} className="text-amber-500" /> LIVE DATA
                                </span>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4 text-balance">
                                {product.clean_name || product.name}
                            </h1>

                            <div className="flex items-center gap-4 text-sm font-bold text-slate-400 mb-8">
                                <div className="flex items-center gap-2 text-blue-600 bg-blue-50/50 px-3 py-1 rounded-lg border border-blue-100/50">
                                    <Building2 size={14} strokeWidth={2.5} />
                                    <span className="uppercase tracking-wide text-xs">{product.brand || 'LABORATORIO NO IDENTIFICADO'}</span>
                                </div>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="tracking-widest text-xs">ID: {product.id}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 relative z-10">
                            {/* Card 1: Active Ingredient */}
                            <div className="glass-card p-4 rounded-xl border border-slate-100/60 bg-white/40 hover:bg-white/60 transition-all duration-300 group hover:shadow-lg hover:shadow-blue-900/5 hover:border-blue-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-hover:text-blue-500 transition-colors">Principio Activo</p>
                                <p className="text-sm font-bold text-slate-700 md:truncate leading-snug" title={product.active_ingredient}>
                                    {product.active_ingredient || 'N/A'}
                                </p>
                            </div>

                            {/* Card 2: Presentation */}
                            <div className="glass-card p-4 rounded-xl border border-slate-100/60 bg-white/40 hover:bg-white/60 transition-all duration-300 group hover:shadow-lg hover:shadow-blue-900/5 hover:border-blue-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-hover:text-blue-500 transition-colors">Presentación</p>
                                <div className="flex flex-col items-start gap-1">
                                    <span className="text-sm font-bold text-slate-700 leading-none">{product.presentation || 'N/A'}</span>
                                    {product.concentration && (
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{product.concentration}</span>
                                    )}
                                </div>
                            </div>

                            {/* Card 3: ATC Code */}
                            <div className="glass-card p-4 rounded-xl border border-slate-100/60 bg-white/40 hover:bg-white/60 transition-all duration-300 group hover:shadow-lg hover:shadow-blue-900/5 hover:border-blue-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 group-hover:text-blue-500 transition-colors">Código ATC</p>
                                <div className="flex items-center gap-2">
                                    <FileCode size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" strokeWidth={2} />
                                    <p className="text-sm font-bold text-slate-700 font-mono tracking-tight">{product.atc_code || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Card 4: Price */}
                            <div className="glass-card p-4 rounded-xl border border-slate-100/60 bg-white/40 hover:bg-white/60 transition-all duration-300 group hover:shadow-lg hover:shadow-blue-900/5 hover:border-blue-100">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Precio Ref.</p>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                        Bs.{product.original_price?.toFixed(2) || '0.00'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-semibold mt-1">PVP Sugerido</span>
                                </div>
                            </div>

                            {/* Card 5: Branch Coverage */}
                            <div className="glass-card p-4 rounded-xl border border-slate-100/60 bg-white/40 hover:bg-white/60 transition-all duration-300 group hover:shadow-lg hover:shadow-blue-900/5 hover:border-blue-100">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Disponibilidad</p>
                                </div>
                                <div className="flex flex-col h-full justify-between">
                                    <div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                                {algoliaMetrics.availableStores}
                                            </span>
                                            <span className="text-xs text-slate-400 font-bold">/ {algoliaMetrics.totalStores}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${algoliaMetrics.coveragePercent}%` }}></div>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-semibold mt-1">Sucursales con stock</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Market Position & Competitors (Now the main view) */}


                {/* COMPETITOR ANALYSIS SECTION */}
                <CompetitorAnalysis productId={typeof params.id === 'string' ? params.id : ''} />

            </main>
        </div>
    );
}

function CompetitorAnalysis({ productId }: { productId: string }) {
    const [data, setData] = useState<{
        category: string;
        rank: number | string;
        marketShare: number;
        competitors: any[];
    } | null>(null);

    useEffect(() => {
        if (!productId) return;
        fetch(`/api/products/${productId}/competitors`)
            .then(res => res.json())
            .then(json => {
                if (json.success) setData(json);
            })
            .catch(err => console.error("Competitors fetch error", err));
    }, [productId]);

    if (!data) return null;

    return (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-700">
            {/* Rank Card */}
            <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>

                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <Award className="w-5 h-5 text-amber-500" />
                    Posición en Mercado
                </h3>

                <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-slate-50 flex items-center justify-center shadow-inner bg-slate-50/50">
                            <span className="text-5xl font-black text-slate-800">#{data.rank}</span>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-100/80 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                            en {data.category}
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                            <span>Tu Market Share</span>
                            <span className="text-blue-600">{data.marketShare}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(data.marketShare * 5, 100)}%` }}></div> {/* Multiplied for visibility if small */}
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                        Compites contra otros <strong className="text-slate-600">{data.competitors.length + (data.rank as number > 5 ? 5 : 0)}+</strong> productos en esta categoría.
                    </p>
                </div>
            </div>

            {/* Competitors Table */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-slate-400" />
                            Competencia Directa
                        </h3>
                        <p className="text-sm text-slate-400 font-medium">Top 5 rivales por volumen de ventas</p>
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas Estimadas</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Presencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.competitors.map((comp, i) => (
                                <tr key={comp.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {i + 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link href={`/product/${comp.id}`} className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">
                                            {comp.name.substring(0, 40)}{comp.name.length > 40 && '...'}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">
                                        {comp.brand}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-bold text-slate-800">{comp.sales.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 items-center">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min((comp.coverage / 204) * 100, 100)}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-600">{comp.coverage}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
