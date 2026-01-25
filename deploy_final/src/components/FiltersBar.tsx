
"use client";

import { useState, useEffect } from 'react';
import { Search, FlaskConical, Tag, Calendar, Database, Box, MapPin, Building2, Store, ChevronDown } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Location {
    id: string;
    name: string;
    city: string;
    municipality: string;
}

interface FilterOptions {
    labs: string[];
    atc: string[];
    concentrations: string[];
    presentations: string[];
    locations: Location[];
}

interface FiltersBarProps {
    onSearch: (filters: any) => void;
    isLoading?: boolean;
}

export default function FiltersBar({ onSearch, isLoading }: FiltersBarProps) {
    const { data: optionsData } = useSWR('/api/filters/options', fetcher);
    const options: FilterOptions = optionsData?.data || { labs: [], atc: [], concentrations: [], presentations: [], locations: [] };

    const [filters, setFilters] = useState({
        lab: '',
        atcGroup: '', // Changed from atc to atcGroup
        product: '',
        period: '1w',
        concentration: '',
        presentation: ''
    });

    // Fetch Therapeutic Groups
    const { data: atcGroupsData } = useSWR('/api/atc/groups', fetcher);
    const atcGroups = atcGroupsData?.data || [];

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="w-full mt-8 mb-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-600" />
                        Búsqueda de Productos
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Utiliza los filtros para encontrar productos específicos en el mercado farmacéutico.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                    {/* 1. Laboratorio */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <FlaskConical size={14} className="text-blue-500" /> Laboratorio
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.lab}
                                onChange={(e) => handleFilterChange('lab', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">Todos los laboratorios</option>
                                {options.labs.map(lab => (
                                    <option key={lab} value={lab}>{lab}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>

                    {/* 2. Grupo Terapéutico (Dynamic) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Tag size={14} className="text-blue-500" /> Grupo Terapéutico
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.atcGroup}
                                onChange={(e) => handleFilterChange('atcGroup', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">Todos los grupos</option>
                                {atcGroups.map((g: any) => (
                                    <option key={g.id} value={g.id}>{g.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>

                    {/* 3. Producto */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Search size={14} className="text-blue-500" /> Producto
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={filters.product}
                                onChange={(e) => handleFilterChange('product', e.target.value)}
                                placeholder="Buscar nombre..."
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    {/* 4. Periodo */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Calendar size={14} className="text-green-500" /> Período
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.period}
                                onChange={(e) => handleFilterChange('period', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all cursor-pointer"
                            >
                                <option value="1w">1 Semana</option>
                                <option value="1m">1 Mes</option>
                                <option value="3m">3 Meses</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-green-500 transition-colors" />
                        </div>
                    </div>

                    {/* 5. Concentración */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Database size={14} className="text-blue-500" /> Concentración
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.concentration}
                                onChange={(e) => handleFilterChange('concentration', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">Cualquiera</option>
                                {options.concentrations.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>

                    {/* 6. Presentación */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Box size={14} className="text-blue-500" /> Presentación
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.presentation}
                                onChange={(e) => handleFilterChange('presentation', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">Todas</option>
                                {options.presentations.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>





                </div>

                {/* Action Buttons (Aligned with filters) */}
                <div className="flex items-end justify-end gap-6 md:col-span-2 lg:col-span-1 xl:col-span-2 space-y-1.5 h-full pt-6 md:pt-0">
                    <button
                        onClick={() => setFilters({ lab: '', atcGroup: '', product: '', period: '1w', concentration: '', presentation: '' })}
                        className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider transition-colors mb-3"
                    >
                        Limpiar filtros
                    </button>

                    <button
                        onClick={() => onSearch(filters)}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 hover:shadow-blue-500/30 h-[42px]"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Search size={18} />
                        )}
                        Buscar Productos
                    </button>
                </div>
            </div>
        </div>
    );
}
