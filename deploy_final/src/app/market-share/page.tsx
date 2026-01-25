'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from 'recharts';
import { TrendingUp, Package, Award, ArrowLeft, RefreshCw, Building2, ChevronDown, PieChart as PieChartIcon, ArrowUpRight } from 'lucide-react';

// Category options - Top pharma categories
const CATEGORIES = [
    'Medicamentos',
    'Analgésicos',
    'Antiinflamatorios',
    'Antibióticos',
    'Antihipertensivos',
    'Vitaminas',
    'Dermatológicos',
    'Antigripales',
    'Digestivos',
    'Antihistamínicos'
];

// Modern Medical Palette for Charts
const COLORS = [
    '#3B82F6', // Blue 500
    '#0EA5E9', // Sky 500
    '#6366F1', // Indigo 500
    '#8B5CF6', // Violet 500
    '#10B981', // Emerald 500
    '#F59E0B', // Amber 500
    '#F43F5E', // Rose 500
    '#06B6D4', // Cyan 500
    '#EC4899', // Pink 500
    '#84CC16', // Lime 500
];

interface LabData {
    laboratory: string;
    totalSales: number;
    productCount: number;
    marketShare: number;
    avgCoverage: number;
    topProduct: {
        id: string;
        name: string;
        sales: number;
    } | null;
}

interface TopProduct {
    id: string;
    name: string;
    laboratory: string;
    sales: number;
    coverage: number;
}

export default function MarketShareDashboard() {
    const [selectedCategory, setSelectedCategory] = useState('Medicamentos');
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<{
        category: string;
        totalProducts: number;
        totalSales: number;
        laboratories: LabData[];
        topProducts: TopProduct[];
    } | null>(null);

    const fetchMarketShare = async (category: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/market-share/${encodeURIComponent(category)}`);
            const json = await res.json();
            if (json.success) {
                setData(json);
            }
        } catch (error) {
            console.error('Error fetching market share:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMarketShare(selectedCategory);
    }, [selectedCategory]);

    // Format large numbers
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    // Prepare chart data
    const barChartData = data?.laboratories.slice(0, 10).map((lab, i) => ({
        name: lab.laboratory.length > 12 ? lab.laboratory.substring(0, 12) + '...' : lab.laboratory,
        fullName: lab.laboratory,
        sales: lab.totalSales,
        share: lab.marketShare,
        color: COLORS[i % COLORS.length]
    })) || [];

    const pieChartData = data?.laboratories.slice(0, 5).map((lab, i) => ({
        name: lab.laboratory,
        value: lab.totalSales,
        color: COLORS[i % COLORS.length]
    })) || [];

    // Add "Otros" for remaining
    if (data && data.laboratories.length > 5) {
        const othersTotal = data.laboratories.slice(5).reduce((sum, l) => sum + l.totalSales, 0);
        pieChartData.push({
            name: 'Otros',
            value: othersTotal,
            color: '#CBD5E1' // Slate 300 for others
        });
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-blue-100">
            <Navbar />

            <main className="w-full max-w-[95%] lg:max-w-[1800px] mx-auto px-4 md:px-8 py-8 md:py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">

                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                                    <TrendingUp className="w-6 h-6" strokeWidth={3} />
                                </span>
                                Market Share Dashboard
                            </h1>
                            <p className="text-slate-500 font-medium mt-1 ml-1">Análisis de participación de mercado por laboratorio</p>
                        </div>
                    </div>

                    {/* Category Selector */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm flex items-center p-1 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <div className="pl-3 pr-2 text-slate-400">
                                <Package size={16} strokeWidth={2.5} />
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="appearance-none bg-transparent border-none text-sm font-bold text-slate-700 py-2.5 pl-1 pr-10 focus:outline-none cursor-pointer min-w-[200px]"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-32 animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <RefreshCw className="w-6 h-6 text-blue-500 animate-pulse" />
                            </div>
                        </div>
                        <span className="mt-4 text-slate-400 font-medium tracking-wide animate-pulse">Analizando mercado...</span>
                    </div>
                )}

                {/* Dashboard Content */}
                {!isLoading && data && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                {
                                    icon: Package,
                                    label: 'Total Productos',
                                    value: formatNumber(data.totalProducts),
                                    sub: 'En catálogo',
                                    // Blue Theme
                                    bgClass: 'bg-blue-500/10',
                                    borderClass: 'border-blue-200',
                                    textClass: 'text-blue-900',
                                    subClass: 'text-blue-800/60',
                                    iconBgClass: 'bg-white/60 text-blue-600',
                                    blurClass: 'bg-blue-500/20', // blob
                                    hoverShadow: 'hover:shadow-blue-500/20'
                                },
                                {
                                    icon: TrendingUp,
                                    label: 'Ventas Totales',
                                    value: formatNumber(data.totalSales),
                                    sub: 'Unidades vendidas',
                                    // Emerald Theme
                                    bgClass: 'bg-emerald-500/10',
                                    borderClass: 'border-emerald-200',
                                    textClass: 'text-emerald-900',
                                    subClass: 'text-emerald-800/60',
                                    iconBgClass: 'bg-white/60 text-emerald-600',
                                    blurClass: 'bg-emerald-500/20',
                                    hoverShadow: 'hover:shadow-emerald-500/20'
                                },
                                {
                                    icon: Building2,
                                    label: 'Laboratorios',
                                    value: data.laboratories.length,
                                    sub: 'Compitiendo',
                                    // Purple Theme (Requested "Morado")
                                    bgClass: 'bg-purple-500/10',
                                    borderClass: 'border-purple-200',
                                    textClass: 'text-purple-900',
                                    subClass: 'text-purple-800/60',
                                    iconBgClass: 'bg-white/60 text-purple-600',
                                    blurClass: 'bg-purple-500/20',
                                    hoverShadow: 'hover:shadow-purple-500/20'
                                },
                                {
                                    icon: Award,
                                    label: 'Líder de Categoría',
                                    value: data.laboratories[0]?.laboratory.substring(0, 15) || 'N/A',
                                    sub: `${data.laboratories[0]?.marketShare || 0}% Market Share`,
                                    isHighlight: true,
                                    // Amber Theme
                                    bgClass: 'bg-amber-500/10',
                                    borderClass: 'border-amber-200',
                                    textClass: 'text-amber-900',
                                    subClass: 'text-amber-800/60',
                                    iconBgClass: 'bg-white/60 text-amber-600',
                                    blurClass: 'bg-amber-500/20',
                                    hoverShadow: 'hover:shadow-amber-500/20'
                                }
                            ].map((card, i) => (
                                <div key={i} className={`p-6 rounded-2xl border ${card.borderClass} ${card.bgClass} backdrop-blur-xl shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] hover:shadow-xl ${card.hoverShadow} hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden`}>
                                    <div className={`absolute top-0 right-0 w-32 h-32 ${card.blurClass} rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 transition-opacity group-hover:opacity-100 opacity-0`}></div>

                                    <div className="flex items-start justify-between relative z-10">
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-widest mb-1 opacity-80 ${card.subClass}`}>{card.label}</p>
                                            <h3 className={`text-3xl font-black tracking-tight ${card.textClass}`}>
                                                {card.value}
                                            </h3>
                                        </div>
                                        <div className={`p-3 rounded-2xl shadow-sm backdrop-blur-sm group-hover:scale-110 group-hover:bg-white/80 transition-all ${card.iconBgClass}`}>
                                            <card.icon size={24} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                    <p className={`text-xs font-bold mt-4 ${card.subClass}`}>
                                        {card.sub}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Bar Chart (Left - Wider) */}
                            <div className="lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-blue-500" />
                                            Top 10 Laboratorios
                                        </h3>
                                        <p className="text-sm text-slate-400 font-medium">Volumen de ventas por laboratorio</p>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200">
                                        Ranking
                                    </div>
                                </div>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={barChartData} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }} barSize={20}>
                                            <XAxis type="number" tickFormatter={formatNumber} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={90} tickLine={false} axisLine={false} fontWeight={600} />
                                            <Tooltip
                                                cursor={{ fill: '#F1F5F9', opacity: 0.5 }}
                                                contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                                labelStyle={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
                                                formatter={(value, _name, props) => [
                                                    <span key="val" className='font-bold text-slate-800'>{formatNumber(value as number)} Unids</span>,
                                                    <span key="share" className='text-xs text-blue-500 font-medium ml-2'>{(props as any).payload.share}% Share</span>
                                                ]}
                                            />
                                            <Bar dataKey="sales" radius={[0, 6, 6, 0]} background={{ fill: '#F8FAFC', radius: [0, 6, 6, 0] }}>
                                                {barChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Pie Chart (Right) */}
                            <div className="lg:col-span-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col">
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <PieChartIcon className="w-5 h-5 text-purple-500" />
                                        Participación
                                    </h3>
                                    <p className="text-sm text-slate-400 font-medium">Distribución % del mercado</p>
                                </div>

                                <div className="flex-1 min-h-[300px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={105}
                                                paddingAngle={4}
                                                dataKey="value"
                                                cornerRadius={6}
                                            >
                                                {pieChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                                itemStyle={{ color: '#1E293B', fontWeight: 'bold' }}
                                                formatter={(value) => formatNumber(value as number)}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value) => <span className="text-xs font-bold text-slate-500 ml-1">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                                        <span className="text-3xl font-black text-slate-800">{data.laboratories.length}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Labs</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Products Table */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <Package className="w-5 h-5 text-emerald-500" />
                                        Top 10 Productos
                                    </h3>
                                    <p className="text-sm text-slate-400 font-medium mt-1">Líderes en ventas de {data.category}</p>
                                </div>
                                <button className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1">
                                    Ver Todo <ArrowUpRight size={14} />
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-100">
                                            <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                            <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                                            <th className="px-8 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Laboratorio</th>
                                            <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Ventas</th>
                                            <th className="px-8 py-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Cobertura</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {data.topProducts.map((product, i) => (
                                            <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-8 py-4">
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${i === 0 ? 'bg-amber-100 text-amber-600' :
                                                        i === 1 ? 'bg-slate-200 text-slate-600' :
                                                            i === 2 ? 'bg-orange-100 text-orange-600' :
                                                                'bg-slate-50 text-slate-400'
                                                        }`}>
                                                        {i + 1}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <Link
                                                        href={`/product/${product.id}`}
                                                        className="font-bold text-slate-700 hover:text-blue-600 transition-colors block text-sm group-hover:translate-x-1 duration-300"
                                                    >
                                                        {product.name}
                                                    </Link>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                                        <Building2 size={14} className="text-slate-300" />
                                                        {product.laboratory}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <span className="font-bold text-emerald-600 text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                                                        {formatNumber(product.sales)} unids
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex justify-end">
                                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-500 border border-blue-100/50">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                                            {product.coverage} tiendas
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Laboratory Analysis Section */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-indigo-500" />
                                    Radiografía del Mercado
                                </h3>
                                <p className="text-sm text-slate-400 font-medium mt-1">Detalle completo por laboratorio</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-white border-b border-slate-100">
                                            <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest w-16">#</th>
                                            <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Laboratorio</th>
                                            <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Productos</th>
                                            <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Volumen</th>
                                            <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest w-48">Market Share</th>
                                            <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Cobertura Media</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {data.laboratories.map((lab, i) => (
                                            <tr key={lab.laboratory} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-8 py-4 text-sm font-bold text-slate-400">{i + 1}</td>
                                                <td className="px-8 py-4">
                                                    <span className="font-bold text-slate-700 hover:text-blue-600 transition-colors block text-sm group-hover:translate-x-1 duration-300 transform">{lab.laboratory}</span>
                                                    {lab.topProduct && (
                                                        <span className="text-[10px] text-slate-400 font-medium group-hover:translate-x-1 duration-300 delay-75 block">Top: {lab.topProduct.name.substring(0, 20)}...</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <span className="text-sm font-semibold text-slate-600">{lab.productCount}</span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <span className="text-sm font-black text-slate-800">{formatNumber(lab.totalSales)}</span>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full relative overflow-hidden"
                                                                style={{ width: `${Math.min(lab.marketShare, 100)}%` }}
                                                            >
                                                                <div className="absolute inset-0 bg-white/20"></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-blue-600 w-12 text-right">{lab.marketShare}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">{lab.avgCoverage} tiendas</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && (!data || data.laboratories.length === 0) && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm mt-8">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Sin datos para esta categoría</h3>
                        <p className="text-slate-500 max-w-md mx-auto">No encontramos registros de ventas o productos para la categoría seleccionada en este periodo.</p>
                        <button
                            onClick={() => setSelectedCategory('Medicamentos')}
                            className="mt-6 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                        >
                            Volver a General
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
