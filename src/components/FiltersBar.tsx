
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
        atc: '',
        product: '',
        period: '1w',
        concentration: '',
        presentation: '',
        city: '',
        municipality: '',
        branch: ''
    });

    // Derived location options
    const cities = Array.from(new Set(options.locations.map(l => l.city))).sort();
    const municipalities = Array.from(new Set(options.locations
        .filter(l => !filters.city || l.city === filters.city)
        .map(l => l.municipality))).sort();
    const branches = options.locations
        .filter(l => (!filters.city || l.city === filters.city) &&
            (!filters.municipality || l.municipality === filters.municipality))
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            // Reset dependent fields
            if (key === 'city') {
                newFilters.municipality = '';
                newFilters.branch = '';
            }
            if (key === 'municipality') {
                newFilters.branch = '';
            }
            return newFilters;
        });
    };

    return (
        <div className="w-full mt-8 mb-4">
            <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl shadow-blue-900/5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

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

                    {/* 2. ATC */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Tag size={14} className="text-blue-500" /> Código ATC
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.atc}
                                onChange={(e) => handleFilterChange('atc', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">Todos los códigos</option>
                                {options.atc.map(code => (
                                    <option key={code} value={code}>{code}</option>
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

                    {/* 7. Ciudad */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <MapPin size={14} className="text-blue-500" /> Ciudad
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.city}
                                onChange={(e) => handleFilterChange('city', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">Todas las ciudades</option>
                                {cities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>

                    {/* 8. Municipio */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Building2 size={14} className="text-blue-500" /> Municipio
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.municipality}
                                onChange={(e) => handleFilterChange('municipality', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">Todos los municipios</option>
                                {municipalities.map(mun => (
                                    <option key={mun} value={mun}>{mun}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>

                    {/* 9. Sucursal */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Store size={14} className="text-blue-500" /> Sucursal
                        </label>
                        <div className="relative group">
                            <select
                                value={filters.branch}
                                onChange={(e) => handleFilterChange('branch', e.target.value)}
                                className="w-full bg-white/60 border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">Todas las sucursales</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>

                    {/* 10. Search Button Slot */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-transparent select-none uppercase tracking-wider ml-1 flex items-center gap-1.5">
                            <Search size={14} className="opacity-0" /> Buscar
                        </label>
                        <button
                            onClick={() => onSearch(filters)}
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 h-[41px]"
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

                {/* Optional: Clear Filters or Apply button if needed */}
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={() => setFilters({ lab: '', atc: '', product: '', period: '1w', concentration: '', presentation: '', city: '', municipality: '', branch: '' })}
                        className="text-[10px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                        Limpiar todos los filtros
                    </button>
                </div>
            </div>
        </div>
    );
}
