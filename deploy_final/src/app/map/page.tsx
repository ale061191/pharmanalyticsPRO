'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { Navigation, Search, Filter } from 'lucide-react';

// Import the Map component dynamically with SSR disabled
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center w-full h-full bg-slate-100 text-slate-400">
            <div className="animate-pulse">Cargando Mapa...</div>
        </div>
    )
});

interface Branch {
    id: string;
    name: string;
    city: string;
    municipality?: string;
    lat: number;
    lng: number;
    address?: string;
    status: 'neutral' | 'healthy' | 'warning' | 'critical';
    stockCount?: number;
}

export default function MapPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [labs, setLabs] = useState<string[]>([]);

    // Fetch Labs
    useEffect(() => {
        async function fetchLabs() {
            try {
                const res = await fetch('/api/labs');
                const data = await res.json();
                if (data.labs) setLabs(data.labs);
            } catch (e) {
                console.error("Failed to load labs", e);
            }
        }
        fetchLabs();
    }, []);

    // Filters
    const [filters, setFilters] = useState({
        city: '',
        municipality: '',
        product: '',
        lab: '',
        category: ''
    });

    // Debounce for text inputs
    const [debouncedProduct, setDebouncedProduct] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedProduct(filters.product), 600);
        return () => clearTimeout(timer);
    }, [filters.product]);

    // Derived options for SELECTs
    const cityOptions = useMemo(() => Array.from(new Set(branches.map(b => b.city))).sort(), [branches]);
    const municipalityOptions = useMemo(() => {
        if (!filters.city) return [];
        return Array.from(new Set(branches.filter(b => b.city === filters.city).map(b => b.municipality || ''))).filter(Boolean).sort();
    }, [branches, filters.city]);


    // Search Data from API
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const query = new URLSearchParams();
                if (filters.city) query.set('city', filters.city);
                if (filters.municipality) query.set('municipality', filters.municipality);
                if (debouncedProduct) query.set('product', debouncedProduct);
                if (filters.lab) query.set('lab', filters.lab);

                const res = await fetch(`/api/map-data?${query.toString()}`);
                const json = await res.json();

                if (json.success) {
                    setBranches(json.data);
                }
            } catch (err) {
                console.error('Map fetch error:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [filters.city, filters.municipality, filters.lab, debouncedProduct]);

    return (
        <div className="min-h-screen bg-slate-50 relative flex flex-col overflow-hidden">
            <Navbar />

            {/* Map Content */}
            <div className="flex-1 relative z-0">
                <div className="absolute inset-0">
                    <LeafletMap
                        branches={branches}
                        isProductSelected={!!debouncedProduct}
                    />
                </div>

                {/* Filters Panel */}
                <div className="absolute top-6 left-6 z-[1000] w-96 glass-panel p-6 shadow-2xl rounded-2xl border border-white/50 backdrop-blur-md bg-white/80 max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-6 text-purple-800">
                        <Navigation size={24} />
                        <h1 className="text-xl font-bold">Explorador de Red</h1>
                    </div>

                    {/* Product Search */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Producto</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Ej: Acetaminofen..."
                                    className="w-full pl-9 pr-4 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    value={filters.product}
                                    onChange={e => setFilters({ ...filters, product: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Laboratorio (DROPDOWN) */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Laboratorio</label>
                            <div className="relative">
                                <select
                                    className="w-full pl-3 pr-8 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer"
                                    value={filters.lab}
                                    onChange={e => setFilters({ ...filters, lab: e.target.value })}
                                >
                                    <option value="">Todos los laboratorios</option>
                                    {labs.map((lab) => (
                                        <option key={lab} value={lab}>{lab}</option>
                                    ))}
                                </select>
                                {/* Custom Arrow Icon */}
                                <div className="absolute right-3 top-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 my-4"></div>

                    {/* Geo Filters */}
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ciudad</label>
                                <select
                                    className="w-full px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={filters.city}
                                    onChange={e => setFilters({ ...filters, city: e.target.value, municipality: '' })}
                                >
                                    <option value="">Todas</option>
                                    <option value="Caracas">Caracas</option>
                                    <option value="Valencia">Valencia</option>
                                    <option value="Maracay">Maracay</option>
                                    <option value="Barquisimeto">Barquisimeto</option>
                                    <option value="Maracaibo">Maracaibo</option>
                                    <option value="Lechería">Lechería</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Municipio</label>
                                <select
                                    className="w-full px-3 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                                    value={filters.municipality}
                                    onChange={e => setFilters({ ...filters, municipality: e.target.value })}
                                    disabled={!filters.city}
                                >
                                    <option value="">Todos</option>
                                    {municipalityOptions.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase">Leyenda de Stock</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Sano</span>
                                <span className="text-slate-400">&gt; 30 uds</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Advertencia</span>
                                <span className="text-slate-400">10-30 uds</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Crítico</span>
                                <span className="text-slate-400">&lt; 10 uds</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 text-[10px] text-center text-slate-400">
                        {branches.length} sucursales visibles
                    </div>
                </div>
            </div>
        </div>
    );
}
