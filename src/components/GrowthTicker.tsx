"use client";

import { useEffect, useState, useMemo } from 'react';
import useSWR from 'swr';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Sparkles, TrendingUp, Activity } from 'lucide-react';

interface HistoryPoint {
    date: string;
    value: number;
}

interface Product {
    id: string;
    name: string;
    category: string;
    avg_price: number;
    original_price: number | null;
    image_url: string;
    score: number; // Health Score
    weekly_diff: number; // Difference from previous week
    history: HistoryPoint[];
}

const CATEGORIES = [
    "Todos",
    "Salud Respiratoria y Gripe",
    "Medicamentos",
    "Dolor General",
    "Salud Digestiva",
    "Vitaminas y Productos Naturales",
    "Dermatológicos",
    "Cuidado De Los Pies",
    "Cuidado De La Vista",
    "Nutrición y Vida Saludable",
    "Botiquín y Primeros Auxilios",
    "Formulas Magistrales",
    "Rehabilitación y Equipos Médicos",
    "Incontinencia"
];

function GlassCard({ product }: { product: Product }) {
    // Trend color: now based on depletion (health_score)
    // 0-30% = Static/Slow (-), 31-70% = Healthy (+), 71-100% = High Velocity (+++)
    const score = Number(product.score) || 0;
    const isGrowing = score > 30;
    const lineColor = score > 70 ? "#8b5cf6" : (score > 30 ? "#10b981" : "#ef4444");

    // Randomize mock history if empty (for visualization until we have 3 days of data)
    const data = product.history && product.history.length > 1
        ? product.history
        : [
            { value: 10 + Math.random() * 5 },
            { value: 12 + Math.random() * 5 },
            { value: 15 + Math.random() * 5 },
            { value: 14 + Math.random() * 5 },
            { value: 18 + Math.random() * 5 }
        ];

    const chartData = data.map((d, i) => ({ i, value: d.value || 0 }));

    return (
        <div className="w-[280px] h-[160px] flex-shrink-0 mx-3 relative overflow-hidden rounded-2xl border border-white/30 bg-white/10 backdrop-blur-md shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] transition-all duration-300 group">
            {/* Background Gradient Mesh */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/30 transition-colors" />

            <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center p-1 shadow-sm">
                        {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                        ) : (
                            <Activity className="w-5 h-5 text-blue-600" />
                        )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${score > 30 ? 'bg-green-400/20 text-green-700' : 'bg-red-400/20 text-red-700'}`}>
                        {Math.min(Math.round(score), 100)}%
                    </span>
                </div>

                {/* Info */}
                <div className="mt-2">
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1" title={product.name}>
                        {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{product.category}</p>
                </div>

                {/* Price & Graph */}
                <div className="flex items-end justify-between mt-auto">
                    <div className="flex flex-col">
                        <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">
                            SALUD DE VENTAS
                        </div>
                        <div className={`flex items-center gap-1 text-[11px] font-bold ${product.weekly_diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {product.weekly_diff >= 0 ? '▲' : '▼'}
                            {Math.abs(Math.round(product.weekly_diff))}% vs semana ant.
                        </div>
                    </div>
                    <div className="w-24 h-12 -mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={lineColor}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function GrowthTicker() {
    const [category, setCategory] = useState("Todos");

    // Use SWR for lightning-fast, cached loading
    const { data: swrData, error, isLoading: loading } = useSWR(
        `/api/rankings?category=${category === "Todos" ? "" : encodeURIComponent(category)}&limit=20&sort=growth`,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // Cache for 1 minute
        }
    );

    const products = useMemo(() => swrData?.success ? swrData.data : [], [swrData]);

    const displayProducts = useMemo(() => {
        if (!products || products.length === 0) return [];
        // Duplicate list for infinite scroll effect (need enough items)
        if (products.length < 5) return [...products, ...products, ...products, ...products];
        return [...products, ...products];
    }, [products]);

    return (
        <div className="w-full mb-8 space-y-4">
            {/* Consolidated Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-1">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 shadow-sm">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-1 bg-clip-text text-transparent bg-gradient-to-r from-[#0066cc] to-[#32cd32]">
                            Tendencias de Mercado
                        </h1>
                        <p className="text-sm text-slate-500 font-medium max-w-2xl">
                            Business Intelligence analizando el desarrollo y crecimiento de los productos farmacéuticos para potenciar decisiones estratégicas reales.
                        </p>
                    </div>
                </div>

                <div className="relative group">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="appearance-none bg-white/50 border border-white/60 text-slate-700 text-sm rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md shadow-sm transition-all hover:bg-white/80 cursor-pointer font-semibold"
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            {/* Infinite Scroll Ticker */}
            <div className="relative w-full overflow-hidden py-4 -mx-4 px-4 mask-gradient-x">
                {loading ? (
                    <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm animate-pulse">
                        Calculando velocidad de ventas...
                    </div>
                ) : (
                    <div className="flex w-max hover:[animation-play-state:paused] animate-marquee"
                        style={{
                            // Slower animation (higher duration)
                            animationDuration: `${Math.max(60, displayProducts.length * 6)}s`
                        }}
                    >
                        {displayProducts.map((p, idx) => (
                            <GlassCard key={`${p.id}-${idx}`} product={p} />
                        ))}
                    </div>
                )}

                {/* Fade Edges */}
                <div className="absolute top-0 left-0 h-full w-20 bg-gradient-to-r from-[var(--color-background)] to-transparent z-10 pointer-events-none"></div>
                <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-[var(--color-background)] to-transparent z-10 pointer-events-none"></div>
            </div>
        </div>
    );
}
