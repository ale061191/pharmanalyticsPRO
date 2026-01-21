'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
    ArrowLeft, RefreshCw, MapPin, TrendingUp, Package, X, Store,
    ChevronRight, Search, Globe, Layout, Zap, ArrowLeft as BackIcon,
    FileCode, Building2
} from 'lucide-react';
import Link from 'next/link';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
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
        return (
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] min-w-[180px]">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">
                    {label}
                </p>
                <div className="space-y-2">
                    {/* Sales - Blue */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                            <span className="text-xs font-bold text-slate-600">Demanda</span>
                        </div>
                        <span className="text-sm font-black text-blue-600 font-mono">
                            {payload.find((p: any) => p.dataKey === 'cumulative_sales')?.value}
                        </span>
                    </div>
                    {/* Stock - Green */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                            <span className="text-xs font-bold text-slate-600">Stock</span>
                        </div>
                        <span className="text-sm font-black text-emerald-500 font-mono">
                            {payload.find((p: any) => p.dataKey === 'stock')?.value}
                        </span>
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
    const [stockByRegion, setStockByRegion] = useState<CityStockData[]>([]);
    const [stockLoading, setStockLoading] = useState(true);
    const [citySearch, setCitySearch] = useState("");
    const [period, setPeriod] = useState(30);

    // Modal states
    const [selectedCityModal, setSelectedCityModal] = useState<string | null>(null);
    const [selectedMunicipioModal, setSelectedMunicipioModal] = useState<string | null>(null);
    const [cityDetailData, setCityDetailData] = useState<CityDetailData[]>([]);

    // UNIFIED: Map locations derived from same data as sidebar
    const [mapLocations, setMapLocations] = useState<any[]>([]);

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
                        category: data.category || 'Salud'
                    });
                    fetchHistory(data.id, period);
                    fetchStockByCity(data.name, data.id);
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
            fetchHistory(product.id, period);
        }
    }, [period]);

    async function fetchHistory(productId: string, days: number) {
        try {
            const res = await fetch(`/api/products/${productId}/history?days=${days}`);
            const json = await res.json();
            if (json.history) {
                setChartData(json.history.map((d: any) => ({
                    ...d,
                    formattedDate: new Date(d.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', timeZone: 'UTC' })
                })));
            }
        } catch (e) {
            console.error("Error fetching history", e);
        }
    }

    // UNIFIED DATA FETCH: Creates both Sidebar city data AND Map locations from same source
    async function fetchStockByCity(productName: string, productId: string) {
        setStockLoading(true);
        try {
            // Fetch ALL stores with coordinates and municipality
            const { data: allStores, error: storesError } = await supabase
                .from('sucursales')
                .select('id, name, city, municipality, address, lat, lng');

            if (storesError || !allStores) {
                throw new Error('Failed to fetch stores');
            }

            // Fetch inventory for this product
            const { data: inventory, error: inventoryError } = await supabase
                .from('store_inventory')
                .select('quantity, sucursal_id')
                .eq('product_id', productId);

            if (inventoryError) {
                throw new Error('Failed to fetch inventory');
            }

            // Create inventory lookup map
            const inventoryMap = new Map();
            inventory?.forEach((item: any) => {
                inventoryMap.set(item.sucursal_id, item.quantity);
            });

            // CITY NAME NORMALIZATION function
            const normalizeCity = (city: string): string => {
                if (city === 'Puerto Ordaz') return 'Ciudad Guayana';
                if (city === 'Maturin') return 'Maturín';
                if (city === 'Ciudad Bolivar') return 'Ciudad Bolívar';
                if (city === 'Merida') return 'Mérida';
                if (city === 'Cumana') return 'Cumaná';
                if (city === 'San Cristobal') return 'San Cristóbal';
                if (city === 'Carupano') return 'Carúpano';
                return city;
            };

            // Build UNIFIED data structures
            const cities: Record<string, CityDetailData> = {};
            const locations: any[] = [];

            for (const store of allStores) {
                const stock = inventoryMap.get(store.id) || 0;
                const rawCity = store.city || 'Desconocido';
                const cityName = normalizeCity(rawCity);

                // Add to MAP locations (flat array with coordinates)
                if (store.lat && store.lng) {
                    locations.push({
                        id: store.id,
                        name: store.name,
                        lat: store.lat,
                        lng: store.lng,
                        city: cityName,
                        municipality: store.municipality,
                        address: store.address || '',
                        stock: stock
                    });
                }

                // Add to SIDEBAR cities (grouped by city > municipality > store)
                if (!cities[cityName]) {
                    cities[cityName] = { city: cityName, sectors: [], total_stock: 0 };
                }

                // Use actual municipality name, capitalize first letter
                const municipioName = store.municipality
                    ? store.municipality.charAt(0).toUpperCase() + store.municipality.slice(1).toLowerCase()
                    : 'General';

                let sector = cities[cityName].sectors.find(s => s.sector === municipioName);
                if (!sector) {
                    sector = { sector: municipioName, stores: [] };
                    cities[cityName].sectors.push(sector);
                }

                sector.stores.push({
                    name: store.name,
                    address: store.address || '',
                    stock_count: stock,
                    availability_status: stock > 10 ? 'high' : (stock > 0 ? 'medium' : 'low')
                });

                cities[cityName].total_stock += stock;
            }

            // Set unified data
            setMapLocations(locations);
            setCityDetailData(Object.values(cities));

            const regionData = Object.values(cities).map((c) => ({
                city: c.city,
                status: c.total_stock > 10 ? 'High' : (c.total_stock > 0 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
                count: c.total_stock
            }));
            setStockByRegion(regionData);

        } catch (e) {
            console.error("Error fetching stock data", e);
            setCityDetailData([]);
            setStockByRegion([]);
            setMapLocations([]);
        } finally {
            setStockLoading(false);
        }
    }

    const StockMap = dynamic(() => import('@/components/StockMap'), {
        ssr: false,
        loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-[40px] flex items-center justify-center font-black text-slate-400">CARGANDO MAPA DE DISPONIBILIDAD...</div>
    });

    if (loading || !product) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    const currentCityData = cityDetailData.find(c => c.city === selectedCityModal);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-purple-100">
            <Navbar />

            <main className="max-w-[1440px] mx-auto px-6 py-10">
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
                                {product.name}
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

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
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
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* Visual Analytics Column (Left/Center) */}
                    <div className="lg:col-span-9 space-y-12">

                        {/* 1. Performance Chart */}
                        <section className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 relative z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-1">Evolución de Mercado</h2>
                                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest flex items-center gap-1">
                                        <TrendingUp size={10} className="text-emerald-500" /> Ventas vs Inventario Global
                                    </p>
                                </div>
                                <div className="flex bg-slate-100/50 p-1.5 rounded-xl border border-white/40 backdrop-blur-sm">
                                    {[1, 7, 30, 90].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setPeriod(d)}
                                            className={`px-4 py-2 rounded-lg text-[9px] font-bold transition-all duration-300 tracking-wider ${period === d ? 'bg-white text-blue-600 shadow-md ring-1 ring-blue-100' : 'text-slate-400 hover:text-slate-600'}`}>
                                            {d === 1 ? 'HOY' : `${d} DÍAS`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="formattedDate"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                                            dy={20}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '4 4' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="cumulative_sales"
                                            name="Demanda Acumulada"
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            fill="url(#chartGradient)"
                                            animationDuration={1500}
                                        />
                                        <Area
                                            type="stepAfter"
                                            dataKey="stock"
                                            name="Nivel de Stock"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fill="transparent"
                                            strokeDasharray="4 4"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* 2. Map Section - STACKED BELOW */}
                        <section className="glass-panel p-2 rounded-2xl overflow-hidden">
                            <div className="p-6 pb-3">
                                <h2 className="text-xl font-bold text-slate-900 mb-0.5">Localización Capilar</h2>
                                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">Mapping de Distribución de Inventario en Tiempo Real</p>
                            </div>
                            <div className="h-[450px] w-full rounded-2xl overflow-hidden m-2 border border-slate-100">
                                <StockMap productId={product.id} locations={mapLocations} />
                            </div>
                        </section>
                    </div>

                    {/* Regional Control Column (Right Sidebar) */}
                    <div className="lg:col-span-3 space-y-10">
                        <section className="glass-panel p-6 rounded-2xl flex flex-col h-full max-h-[850px]">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                <Globe size={20} className="text-blue-600" />
                                <span>Cobertura</span>
                            </h3>

                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                <input
                                    type="text"
                                    placeholder="Filtrar ciudad..."
                                    value={citySearch}
                                    onChange={e => setCitySearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500/10 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar max-h-[750px]">
                                {stockByRegion
                                    .filter(c => c.city.toLowerCase().includes(citySearch.toLowerCase()))
                                    .sort((a, b) => b.count - a.count) // Sort by stock count descending
                                    .map(cityData => {
                                        const units = cityData.count;

                                        return (
                                            <button
                                                key={cityData.city}
                                                onClick={() => setSelectedCityModal(cityData.city)}
                                                className="w-full flex items-center justify-between p-3 bg-slate-50 border border-transparent rounded-xl hover:border-blue-200 hover:bg-white transition-all duration-200 group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1.5 h-5 rounded-full transition-transform group-hover:scale-110 ${units > 50 ? 'bg-emerald-400' : (units > 0 ? 'bg-amber-400' : 'bg-red-500')}`}></div>
                                                    <span className="text-[11px] font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{cityData.city}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold ${units > 0 ? 'text-slate-600' : 'text-red-500'}`}>{units}u</span>
                                                    <ChevronRight size={12} className="text-slate-200 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </button>
                                        );
                                    })
                                }
                            </div>
                        </section>

                        {/* Scraper Call to Action */}
                        <div className="bg-gradient-to-br from-slate-800 to-blue-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="p-2 bg-white/10 rounded-lg border border-white/10">
                                    <RefreshCw size={16} className="text-blue-300" />
                                </div>
                                <h4 className="font-bold text-sm">Sincronización On-Demand</h4>
                            </div>
                            <p className="text-[10px] font-medium text-slate-300 leading-relaxed mb-4">
                                ¿Necesitas datos más recientes? Inicia un escaneo inteligente ahora.
                            </p>
                            <button
                                className="w-full py-3 bg-white text-blue-900 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md">
                                <Zap size={14} className="text-amber-500 fill-amber-500" /> FORCED SCRAPING
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Hierarchical Drill-down Modal (56 Cities -> Municipios -> Stores) */}
            {selectedCityModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[20px] transition-opacity duration-500" onClick={() => {
                        setSelectedCityModal(null);
                        setSelectedMunicipioModal(null);
                    }}></div>

                    <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                        {/* Modal Header */}
                        <div className="p-8 pb-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe size={14} className="text-blue-600" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ANALYSIS: {selectedCityModal?.toUpperCase()}</span>
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {selectedMunicipioModal || selectedCityModal}
                                </h2>
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                                    {selectedMunicipioModal ? `SUCURSALES DISPONIBLES` : `DESGLOSE POR MUNICIPIO / SECTOR`}
                                </p>
                            </div>
                            <button onClick={() => {
                                if (selectedMunicipioModal) setSelectedMunicipioModal(null);
                                else setSelectedCityModal(null);
                            }} className="group p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm">
                                {selectedMunicipioModal ? <BackIcon size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" /> : <X size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />}
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div className="p-12 pt-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                            {!currentCityData ? (
                                <div className="text-center py-24 flex flex-col items-center">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full border-4 border-purple-50 border-t-purple-600 animate-spin"></div>
                                        <Zap size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600 animate-pulse" />
                                    </div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase mt-8 tracking-[0.3em]">Mapping Geo-Database...</p>
                                </div>
                            ) : !selectedMunicipioModal ? (
                                // Level 1: Municipios
                                <div className="grid grid-cols-1 gap-5">
                                    {currentCityData.sectors
                                        .sort((a, b) => b.stores.reduce((sum, s) => sum + s.stock_count, 0) - a.stores.reduce((sum, s) => sum + s.stock_count, 0))
                                        .map(sector => {
                                            const totalStock = sector.stores.reduce((sum, s) => sum + s.stock_count, 0);
                                            const stockColor = totalStock > 50 ? 'text-emerald-500' : (totalStock > 0 ? 'text-amber-500' : 'text-red-500');
                                            const bgColor = totalStock > 50 ? 'bg-emerald-50' : (totalStock > 0 ? 'bg-amber-50' : 'bg-red-50');

                                            return (
                                                <button
                                                    key={sector.sector}
                                                    onClick={() => setSelectedMunicipioModal(sector.sector)}
                                                    className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 transition-all text-left"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center font-bold text-lg ${stockColor}`}>
                                                            {sector.stores.length}
                                                        </div>
                                                        <div>
                                                            <span className="block text-base font-bold text-slate-900 tracking-tight">{sector.sector}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{sector.stores.length} Sucursales</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="flex items-baseline gap-1 justify-end">
                                                                <span className={`text-xl font-bold tracking-tight ${stockColor}`}>
                                                                    {totalStock}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400">UND</span>
                                                            </div>
                                                            <span className={`text-[9px] font-bold uppercase tracking-wide ${stockColor}`}>
                                                                {totalStock > 50 ? 'Stock Alto' : (totalStock > 0 ? 'Stock Bajo' : 'Sin Stock')}
                                                            </span>
                                                        </div>
                                                        <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={18} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            ) : (
                                // Level 2: Stores (Branches)
                                <div className="space-y-5 animate-in slide-in-from-right-8 duration-500">
                                    {currentCityData.sectors.find(s => s.sector === selectedMunicipioModal)?.stores.map((store, i) => (
                                        <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 hover:shadow-md transition-all">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="p-3 bg-slate-50 rounded-xl text-blue-600 mt-0.5 group-hover:bg-blue-50 transition-colors">
                                                    <Store size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="font-bold text-base text-slate-900 tracking-tight uppercase">{store.name}</h5>
                                                    <p className="text-[11px] font-medium text-slate-500 leading-snug line-clamp-2 max-w-[90%] uppercase">
                                                        {store.address || 'Ubicación Premium'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right pl-4">
                                                <div className="flex items-center justify-end gap-2 mb-1">
                                                    <span className={`text-2xl font-bold tracking-tight ${store.stock_count > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                        {store.stock_count}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 self-end mb-1">UND</span>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${store.stock_count > 10 ? 'bg-emerald-500' : (store.stock_count > 0 ? 'bg-amber-500' : 'bg-red-500')}`}></div>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                        {store.stock_count > 0 ? 'DISPONIBLE' : 'AGOTADO'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer info */}
                        <div className="bg-slate-50/50 p-4 px-8 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-slate-400 font-bold text-[9px] tracking-wider uppercase">
                                <span className="flex items-center gap-1.5"> <RefreshCw size={10} /> UPDATED: TODAY</span>
                            </div>
                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                                pharmAnalytics PRO
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
