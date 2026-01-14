'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { ArrowLeft, RefreshCw, MapPin, TrendingUp, DollarSign, Package, X, Store, ChevronDown, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Mock Data Generators
const generatePriceHistory = () => {
    return Array.from({ length: 7 }, (_, i) => ({
        day: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i],
        price: 100 + Math.random() * 20 - 10,
        competitor: 110 + Math.random() * 15 - 5
    }));
};

// Interfaces for detailed stock data
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

// Stock by region interface (for sidebar display)
interface CityStockData {
    city: string;
    status: 'High' | 'Medium' | 'Low';
    count: number;
}

const getStockStatus = (count: number): 'High' | 'Medium' | 'Low' => {
    if (count >= 10) return 'High';
    if (count >= 3) return 'Medium';
    return 'Low';
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'high': case 'High': return 'bg-green-500';
        case 'medium': case 'Medium': return 'bg-yellow-500';
        default: return 'bg-red-500';
    }
};

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProductDetail() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [stockByRegion, setStockByRegion] = useState<CityStockData[]>([]);
    const [stockLoading, setStockLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [citySearch, setCitySearch] = useState(""); // Search state for city list

    // Modal state for sector details
    const [showSectorModal, setShowSectorModal] = useState(false);
    const [selectedCity, setSelectedCity] = useState<CityDetailData | null>(null);
    const [cityDetailData, setCityDetailData] = useState<CityDetailData[]>([]);
    const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // 1. Fetch Real Product Info from Supabase
        async function fetchProductData(): Promise<string | null> {
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
                        stock: data.stock_count ? `Disponible: ${data.stock_count} u` : 'Consultando...',
                        stock_count: data.stock_count,
                        score: 9.8,
                        url: data.url
                    });

                    // 2. Fetch Trends using the REAL name
                    fetchTrends(data.name);
                    return data.name; // Return name for stock fetch
                } else {
                    // Fallback using mock ID 1-5 from initial load
                    console.log("Product not found in DB, using fallback/mock.");
                    const mockProductBase = {
                        id: params.id,
                        name: 'Atamel FORTE 650mg x 10 Tab',
                        category: 'Salud',
                        price: 135.00,
                        image: 'https://lh3.googleusercontent.com/h3ejm-QO40m7YNuRly_yGzzJZ5KaZJnZE-YLMFaOahV1zwWJnNaIdbUrKOivixbglQOJpfFqIRyXbBPctkc0HckpKXMd99YDkcAwjBhu9CUYjEJ0=s350-rw',
                        stock: 'Disponible',
                        stock_count: 50,
                        score: 9.8,
                        url: 'https://www.farmatodo.com.ve/producto/111026723-acetaminofen-atamel-forte-650-mg-x-10-tabletas'
                    };
                    setProduct(mockProductBase);
                    fetchTrends(mockProductBase.name);
                    return mockProductBase.name;
                }
            } catch (e) {
                console.error("Error loading product", e);
                setLoading(false);
                return null;
            }
        }

        async function fetchTrends(productName: string) {
            try {
                // Request STOCK mode specifically
                const res = await fetch('/api/calc-trends', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_name: productName, mode: 'stock' })
                });
                const json = await res.json();
                if (json.chart_data) setChartData(json.chart_data);
            } catch (e) {
                console.error("Error fetching trends", e);
            } finally {
                setLoading(false);
            }
        }

        // Fetch stock by city for this product
        async function fetchStockByCity(productName: string) {
            setStockLoading(true);
            try {
                // Fetch from new detailed stock API
                const res = await fetch(`/api/scrape-stock-detail?product_name=${encodeURIComponent(productName)}`);
                const json = await res.json();

                if (json.success && json.cities && json.cities.length > 0) {
                    // Cache the detailed data for the modal
                    setCityDetailData(json.cities);

                    // Transform for sidebar display
                    const cityData: CityStockData[] = json.cities.map((c: any) => ({
                        city: c.city,
                        status: getStockStatus(c.total_stock),
                        count: c.total_stock
                    }));
                    setStockByRegion(cityData);
                } else {
                    // No data - show placeholder
                    setStockByRegion([
                        { city: 'Caracas', status: 'Low', count: 0 },
                        { city: 'Valencia', status: 'Low', count: 0 },
                        { city: 'Maracaibo', status: 'Low', count: 0 },
                        { city: 'Barquisimeto', status: 'Low', count: 0 },
                        { city: 'Maracay', status: 'Low', count: 0 },
                        { city: 'Puerto La Cruz', status: 'Low', count: 0 }
                    ]);
                }
            } catch (e) {
                console.error("Error fetching stock by city:", e);
                // Fallback placeholder
                setStockByRegion([
                    { city: 'Error de conexión', status: 'Low', count: 0 }
                ]);
            } finally {
                setStockLoading(false);
            }
        }

        fetchProductData().then((productName) => {
            // After product loads, also fetch stock by city
            if (productName) {
                fetchStockByCity(productName);
            }
        });

    }, [params.id]);

    async function handleUpdate() {
        if (!product?.url) {
            alert("Este producto no tiene una URL vinculada para actualizar.");
            return;
        }
        setUpdating(true);
        try {
            const res = await fetch('/api/scrape-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_url: product.url })
            });
            const json = await res.json();
            if (json.success && json.data && json.data.length > 0) {
                const newData = json.data[0];
                setProduct((prev: any) => ({
                    ...prev,
                    price: newData.avg_price || prev.price,
                    stock: `Disponible: ${newData.stock_count} u`,
                    stock_count: newData.stock_count
                }));
                alert(`Datos actualizados: Stock ${newData.stock_count} u, Precio: ${newData.avg_price}`);
            }
        } catch (e) {
            console.error("Update failed", e);
            alert("Error al actualizar datos.");
        } finally {
            setUpdating(false);
        }
    }

    // Handle city click to show sector details modal
    async function handleCityClick(city: CityStockData) {
        // Show modal immediately with loading state
        setSelectedCity({
            city: city.city,
            total_stock: city.count,
            sectors: [] // Will be populated
        });
        setShowSectorModal(true);
        setExpandedSectors({});

        // Check if we already have cached detail data for this city
        let cityDetail = cityDetailData.find(c => c.city === city.city);

        if (!cityDetail && product?.name) {
            // Try to fetch real data from the API
            try {
                // First try GET to see if we have stored data
                const getRes = await fetch(`/api/scrape-stock-detail?product_name=${encodeURIComponent(product.name)}`);
                const getData = await getRes.json();

                if (getData.success && getData.cities?.length > 0) {
                    // We have stored data
                    cityDetail = getData.cities.find((c: CityDetailData) => c.city === city.city);

                    if (!cityDetail) {
                        // No data for this specific city, try to scrape
                        console.log('No data for city, triggering scrape...');
                        if (product.url) {
                            const scrapeRes = await fetch('/api/scrape-stock-detail', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    product_url: product.url,
                                    product_name: product.name
                                })
                            });
                            const scrapeData = await scrapeRes.json();

                            if (scrapeData.cities?.length > 0) {
                                cityDetail = scrapeData.cities.find((c: CityDetailData) => c.city === city.city);
                                // Cache all scraped data
                                setCityDetailData(prev => [...prev, ...scrapeData.cities]);
                            }
                        }
                    } else {
                        // Cache the fetched data
                        setCityDetailData(prev => [...prev, ...getData.cities]);
                    }
                } else if (product.url) {
                    // No stored data, trigger scrape
                    console.log('No stored data, triggering scrape...');
                    const scrapeRes = await fetch('/api/scrape-stock-detail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            product_url: product.url,
                            product_name: product.name
                        })
                    });
                    const scrapeData = await scrapeRes.json();

                    if (scrapeData.cities?.length > 0) {
                        cityDetail = scrapeData.cities.find((c: CityDetailData) => c.city === city.city);
                        setCityDetailData(prev => [...prev, ...scrapeData.cities]);
                    }
                }
            } catch (error) {
                console.error('Error fetching city details:', error);
            }
        }

        // If still no data, show placeholder
        if (!cityDetail) {
            cityDetail = {
                city: city.city,
                total_stock: city.count,
                sectors: [{
                    sector: 'Datos no disponibles',
                    stores: [{
                        name: 'Ejecuta el scraper para obtener datos reales',
                        address: 'Haz clic en "Actualizar" en la página del producto',
                        stock_count: 0,
                        availability_status: 'none' as const
                    }]
                }]
            };
        }

        setSelectedCity(cityDetail);
    }

    // Toggle sector expansion
    function toggleSector(sectorName: string) {
        setExpandedSectors(prev => ({
            ...prev,
            [sectorName]: !prev[sectorName]
        }));
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-purple-100">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Breadcrumb / Back */}
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft size={16} className="mr-2" />
                        Volver al Dashboard
                    </Link>
                </div>

                {/* Header Content */}
                <div className="glass-panel p-8 rounded-3xl border border-white/50 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                        {/* Product Image */}
                        <div className="w-full md:w-64 h-64 bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-center shadow-sm">
                            {product.image ? (
                                <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain" />
                            ) : (
                                <Package size={64} className="text-slate-300" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-primary mb-2">
                                        {product.category}
                                    </span>
                                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{product.name}</h1>
                                    <div className="flex items-center gap-4 text-muted-foreground mb-6">
                                        <span className="flex items-center gap-1">
                                            <Package size={16} /> Tabletas
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin size={16} /> Farmatodo VE
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <button
                                        onClick={handleUpdate}
                                        disabled={updating}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 disabled:opacity-50">
                                        <RefreshCw size={16} className={updating ? "animate-spin" : ""} />
                                        {updating ? "Actualizando..." : "Actualizar Datos"}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <div className="bg-white/60 p-4 rounded-xl border border-slate-100">
                                    <p className="text-sm text-muted-foreground mb-1">Precio Promedio</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-foreground">Bs.{product.price.toFixed(2)}</span>
                                        <span className="text-xs text-green-600 font-medium flex items-center">
                                            <TrendingUp size={12} className="mr-1" /> -1.2%
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white/60 p-4 rounded-xl border border-slate-100">
                                    <p className="text-sm text-muted-foreground mb-1">Stock Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-lg font-bold text-foreground">Alta Disponibilidad</span>
                                    </div>
                                </div>
                                <div className="bg-white/60 p-4 rounded-xl border border-slate-100">
                                    <p className="text-sm text-muted-foreground mb-1">Health Score</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-purple-600">{product.score}</span>
                                        <span className="text-xs text-muted-foreground">/ 10</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts & Analysis Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Chart */}
                    <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/50">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-foreground">Historial de Stock (7 Días)</h3>
                            <select className="bg-white border border-slate-200 text-sm rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-purple-200">
                                <option>Última Semana</option>
                                <option>Último Mes</option>
                            </select>
                        </div>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        formatter={(value: any) => [`${value} u`, 'Stock']}
                                    />
                                    <Area type="monotone" dataKey="stock" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Sidebar / Map Data */}
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-3xl border border-white/50">
                            <h3 className="font-bold text-lg text-foreground mb-4">Disponibilidad Regional</h3>

                            {/* Search Input */}
                            <div className="mb-4 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar ciudad..."
                                    value={citySearch}
                                    onChange={(e) => setCitySearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                                />
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {stockLoading ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-slate-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-8 bg-slate-200 rounded-full"></div>
                                                <div className="h-4 w-20 bg-slate-200 rounded"></div>
                                            </div>
                                            <div className="h-4 w-12 bg-slate-200 rounded"></div>
                                        </div>
                                    ))
                                ) : stockByRegion.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <p className="text-sm">No hay datos de stock disponibles</p>
                                        <p className="text-xs mt-1">Ejecuta el scraping para este producto</p>
                                    </div>
                                ) : (
                                    stockByRegion
                                        .filter(region => region.city.toLowerCase().includes(citySearch.toLowerCase()))
                                        .map((region) => (
                                            <div
                                                key={region.city}
                                                onClick={() => handleCityClick(region)}
                                                className="flex items-center justify-between p-3 bg-white/50 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-colors cursor-pointer border border-transparent group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-8 rounded-full ${region.status === 'High' ? 'bg-green-500' :
                                                        region.status === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                                                        }`}></div>
                                                    <div>
                                                        <span className="font-medium text-slate-700 group-hover:text-primary">{region.city}</span>
                                                        <p className="text-[10px] text-muted-foreground">Click para ver sectores</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-right">
                                                        <span className="block font-bold text-foreground">{region.count} u</span>
                                                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{region.status}</span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-3xl border border-purple-100 bg-purple-50/50">
                            <h3 className="font-bold text-purple-900 mb-2">💡 AI Insights</h3>
                            <p className="text-sm text-purple-700 leading-relaxed">
                                Se detectó un patrón de precios a la baja en competidores. Se recomienda mantener monitoreo activo en <strong>Valencia</strong> debido a oscilaciones de stock.
                            </p>
                        </div>
                    </div>
                </div>

            </main>

            {/* Sector Details Modal */}
            {showSectorModal && selectedCity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-purple-500 to-indigo-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <MapPin className="w-5 h-5" />
                                        {selectedCity.city}
                                    </h2>
                                    <p className="text-purple-100 text-sm mt-1">
                                        {selectedCity.total_stock} unidades en total • {selectedCity.sectors.length} sectores
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowSectorModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Sectors List */}
                        <div className="p-4 overflow-y-auto max-h-[50vh]">
                            <div className="space-y-3">
                                {selectedCity.sectors.map((sector) => (
                                    <div key={sector.sector} className="border border-slate-200 rounded-2xl overflow-hidden">
                                        {/* Sector Header (clickable) */}
                                        <button
                                            onClick={() => toggleSector(sector.sector)}
                                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                {expandedSectors[sector.sector] ? (
                                                    <ChevronDown className="w-4 h-4 text-primary" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                )}
                                                <span className="font-semibold text-foreground">{sector.sector}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {sector.stores.reduce((sum, s) => sum + s.stock_count, 0)} u
                                                </span>
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                    {sector.stores.length} tiendas
                                                </span>
                                            </div>
                                        </button>

                                        {/* Stores List (expanded) */}
                                        {expandedSectors[sector.sector] && (
                                            <div className="divide-y divide-slate-100">
                                                {sector.stores.map((store, idx) => (
                                                    <div key={idx} className="p-4 bg-white hover:bg-purple-50/30 transition-colors">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-start gap-3">
                                                                <Store className="w-4 h-4 text-slate-400 mt-0.5" />
                                                                <div>
                                                                    <p className="font-medium text-foreground text-sm">{store.name}</p>
                                                                    {store.address && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5">{store.address}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-foreground">{store.stock_count} u</span>
                                                                <div className={`w-2 h-2 rounded-full ${getStatusColor(store.availability_status)}`}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <p className="text-xs text-center text-muted-foreground">
                                Datos de disponibilidad de Farmatodo • Actualizado recientemente
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
