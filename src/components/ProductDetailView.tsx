'use client';

import { useState, useEffect } from 'react';
import {
    ArrowLeft, RefreshCw, TrendingUp, Package, Zap, Building2, FileCode, CheckCircle2, Award
} from 'lucide-react';
import Link from 'next/link';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface ProductDetailViewProps {
    product: any;
    marketData?: any; // For passing down competitor data etc if already loaded
    productId: string;
}

export default function ProductDetailView({ product, productId }: ProductDetailViewProps) {
    if (!product) return null;

    return (
        <div className="w-full animate-in fade-in duration-500">
            {/* Product Header Card */}
            <div className="flex flex-col gap-6 mb-8 items-stretch">
                {/* Image Section */}
                <div className="w-full h-64 glass-panel p-8 rounded-2xl flex items-center justify-center group transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden bg-white">
                    {product.image ? (
                        <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <Package size={80} className="text-slate-100" />
                    )}
                    <div className="absolute top-4 right-4 bg-slate-50 rounded-full px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">
                        {product.classification || 'RX'}
                    </div>
                </div>

                {/* Basic Info Section */}
                {/* Basic Info Section */}
                <div className="flex-1 glass-panel p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group/panel bg-white/60">
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

                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4 text-balance">
                            {product.clean_name || product.name}
                        </h1>

                        <div className="flex items-center gap-4 text-sm font-bold text-slate-400 mb-8">
                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50/50 px-3 py-1 rounded-lg border border-blue-100/50">
                                <Building2 size={14} strokeWidth={2.5} />
                                <span className="uppercase tracking-wide text-xs">{product.brand || 'LABORATORIO NO IDENTIFICADO'}</span>
                            </div>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="tracking-widest text-xs">ID: {productId}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 relative z-10">
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
                                <p className="text-sm font-bold text-slate-700 font-mono tracking-tight">{product.atc_code || product.atc || 'N/A'}</p>
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
                                            {product.store_count || 0}
                                        </span>
                                        <span className="text-xs text-slate-400 font-bold">/ 204</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(((product.store_count || 0) / 204) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                                <span className="text-[9px] text-slate-400 font-semibold mt-1">Sucursales con stock</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* COMPETITOR ANALYSIS SECTION */}
            <CompetitorAnalysis productId={productId} />
        </div>
    );
}

function CompetitorAnalysis({ productId }: { productId: string }) {
    const [data, setData] = useState<{
        category: string;
        rank: number | string;
        marketShare: number;
        competitors: any[];
        totalCategoryProducts?: number; // Added for total count
    } | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchCompetitors = (pageNum: number, isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);

        // Fetch top 20 initially, or next 20
        fetch(`/api/products/${productId}/competitors?page=${pageNum}&limit=20`)
            .then(res => res.json())
            .then(json => {
                if (json.success) {
                    if (isLoadMore) {
                        setData(prev => prev ? {
                            ...prev,
                            competitors: [...prev.competitors, ...json.competitors],
                            totalCategoryProducts: json.totalCategoryProducts || prev.totalCategoryProducts
                        } : json);
                    } else {
                        setData(json);
                    }
                    setHasMore(json.hasMore);
                }
                setLoadingMore(false);
            })
            .catch(err => {
                console.error("Competitors fetch error", err);
                setLoadingMore(false);
            });
    };

    useEffect(() => {
        if (!productId) return;
        setPage(1);
        fetchCompetitors(1, false);
    }, [productId]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchCompetitors(nextPage, true);
    };

    if (!data) return (
        <div className="w-full h-32 flex items-center justify-center text-slate-400 text-xs font-medium animate-pulse">
            Analizando competencia...
        </div>
    );

    return (
        <div className="mt-8 flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-700">
            {/* Rank Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>

                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <Award className="w-4 h-4 text-amber-500" />
                    Posición en Mercado
                </h3>

                <div className="flex items-center justify-between">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-4 border-slate-50 flex items-center justify-center shadow-inner bg-slate-50/50">
                            <span className="text-3xl font-black text-slate-800">#{data.rank}</span>
                        </div>
                    </div>

                    <div className="flex-1 ml-6">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span>Tu Market Share</span>
                            <span className="text-blue-600">{data.marketShare}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(data.marketShare * 5, 100)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Compites contra <strong className="text-slate-600">{data.totalCategoryProducts || data.competitors.length}+</strong> productos.
                        </p>
                    </div>
                </div>
            </div>

            {/* Competitors Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        Competencia Directa
                    </h3>
                </div>

                <div className="flex-1 max-h-[350px] overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <table className="w-full">
                        <tbody className="divide-y divide-slate-50">
                            {data.competitors.map((comp, i) => {
                                const isMyProduct = String(comp.id) === String(productId);
                                return (
                                    <tr key={`${comp.id}-${i}`} className={`transition-colors group ${isMyProduct ? 'bg-blue-50/80 ring-1 ring-blue-200 hover:bg-blue-100/50' : 'hover:bg-slate-50'}`}>
                                        <td className="px-4 py-3">
                                            <span className={`w-6 h-5 rounded flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                #{comp.rank}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/product/${comp.id}`} className="text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors block line-clamp-1">
                                                {comp.name}
                                                {isMyProduct && <span className="ml-2 text-[9px] text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full inline-block">TÚ</span>}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min((comp.coverage / 204) * 100, 100)}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-emerald-600">{Math.round(comp.coverage)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Load More Button */}
                    {hasMore && (
                        <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/30">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        Cargando...
                                    </>
                                ) : (
                                    'Ver más competidores'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
