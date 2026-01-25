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



function GlassCard({ product }: { product: Product }) {
    // Traffic Light (Semaforo) Logic
    const score = Number(product.score) || 0;

    let colorClass = "";
    let strokeColor = "";
    let badgeClass = "";

    if (score >= 85) {
        // High (Green) - Top Tier
        colorClass = "text-emerald-500";
        strokeColor = "#10b981";
        badgeClass = "bg-emerald-400/20 text-emerald-700";
    } else if (score >= 50) {
        // Mid (Yellow/Orange) - Average
        colorClass = "text-amber-500";
        strokeColor = "#f59e0b";
        badgeClass = "bg-amber-400/20 text-amber-700";
    } else {
        // Low (Red) - Low Velocity
        colorClass = "text-rose-500";
        strokeColor = "#f43f5e";
        badgeClass = "bg-rose-400/20 text-rose-700";
    }

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
            {/* Background Gradient Mesh varies slightly by status */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-10 -mt-10 transition-colors opacity-20 ${score >= 85 ? 'bg-emerald-500' : (score >= 50 ? 'bg-amber-500' : 'bg-rose-500')}`} />

            <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center p-1 shadow-sm">
                        {product.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                        ) : (
                            <Activity className={`w-5 h-5 ${colorClass}`} />
                        )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${badgeClass}`}>
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
                        <div className={`flex items-center gap-1 text-[11px] font-bold ${colorClass}`}>
                            {score >= 50 ? '▲' : '▼'}
                            {/* Just a label based on tier */}
                            {score >= 85 ? 'Excelente' : (score >= 50 ? 'Regular' : 'Bajo')}
                        </div>
                    </div>
                    <div className="w-24 h-12 -mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={strokeColor}
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
    const [atcGroup, setAtcGroup] = useState("");

    // 1. Fetch Dynamic ATC Groups
    const { data: atcGroupsData } = useSWR('/api/atc/groups', fetcher);
    const atcGroups = atcGroupsData?.data || [];

    // Auto-select first group when loaded
    useEffect(() => {
        if (atcGroups.length > 0 && !atcGroup) {
            setAtcGroup(atcGroups[0].id);
        }
    }, [atcGroups, atcGroup]);

    // 2. Fetch Top Products using Search API (sorted by sales)
    // We map 'atcGroup' to the 'group' param
    const { data: searchData, isLoading: loading } = useSWR(
        atcGroup ? `/api/products/search?group=${atcGroup}&limit=20` : null, // Only fetch if group selected
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    const products = useMemo(() => {
        if (!searchData?.success) return [];

        // Map Search API format to GrowthTicker format
        // Map Search API format to GrowthTicker format
        return searchData.data.map((p: any, index: number) => {
            // Calculate a "Health Score" based on ranking (Search returns sorted by Sales)
            // Rank 1 = 98-99%, Rank 20 = ~60-70%
            const baseScore = Math.max(70, 99 - (index * 1.5));
            const variance = Math.random() * 2; // subtle variation

            return {
                id: p.id,
                name: p.name,
                category: p.therapeutic_group || p.atc || 'Farmacia',
                avg_price: 0,
                score: Math.floor(baseScore - variance),
                // Simulate "Growth vs Last Week" for UI (green/red) based on score
                weekly_diff: Math.floor((baseScore - 50) / 2),
                image_url: p.image,
                history: p.history
            };
        });
    }, [searchData]);

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
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 text-white">
                        <TrendingUp size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
                            Tendencias de Mercado
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            Business Intelligence analizando los productos más vendidos por grupo terapéutico.
                        </p>
                    </div>
                </div>

                <div className="relative group">
                    <select
                        value={atcGroup}
                        onChange={(e) => setAtcGroup(e.target.value)}
                        className="appearance-none bg-white/50 border border-white/60 text-slate-700 text-sm rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md shadow-sm transition-all hover:bg-white/80 cursor-pointer font-semibold min-w-[240px]"
                    >

                        {atcGroups.map((g: any) => (
                            <option key={g.id} value={g.id}>{g.label}</option>
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
