
"use client";

import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { ExternalLink, Info, Package } from 'lucide-react';

interface ProductResult {
    id: string;
    name: string;
    brand: string;
    atc: string;
    concentration: string;
    presentation: string;
    image: string;
    history: { date: string, value: number }[];
}

interface SearchResultsTableProps {
    results: ProductResult[];
    isVisible: boolean;
}


export default function SearchResultsTable({ results, isVisible }: SearchResultsTableProps) {
    const isEmpty = results.length === 0;

    return (
        <div className="glass-panel mt-6 rounded-3xl overflow-hidden border border-white/20 shadow-xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                            <th className="px-6 py-5 font-bold">Producto</th>
                            <th className="px-6 py-5 font-bold">Presentación</th>
                            <th className="px-6 py-5 font-bold">Concentración</th>
                            <th className="px-6 py-5 font-bold">Evolución</th>
                            <th className="px-8 py-5 font-bold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isEmpty ? (
                            <tr>
                                <td colSpan={5} className="py-24 text-center">
                                    <div className="flex flex-col items-center justify-center animate-pulse-subtle">
                                        <div className="w-20 h-20 bg-blue-50/50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100/50 shadow-inner">
                                            <Package className="text-blue-400/60" size={40} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                                            Selecciona filtros para ver resultados
                                        </h3>
                                        <p className="text-slate-400 text-sm mt-2 max-w-[280px] leading-relaxed">
                                            Ajusta los parámetros de búsqueda para visualizar los productos.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            results.map((product) => (
                                <tr key={product.id} className="hover:bg-blue-50/30 transition-all group cursor-default">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                                                {product.image ? (
                                                    <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-50 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase">Rx</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800 line-clamp-1">{product.name}</div>
                                                <div className="text-[11px] text-slate-400 font-medium tracking-tight">
                                                    {product.brand} • {product.atc || 'Sin código ATC'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                                            {product.presentation}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-semibold text-slate-600">
                                            {product.concentration}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="h-10 w-32">
                                            {product.history && product.history.length > 1 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={product.history}>
                                                        {(() => {
                                                            const first = product.history[0].value;
                                                            const last = product.history[product.history.length - 1].value;
                                                            const isPositive = last >= first;
                                                            return (
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="value"
                                                                    stroke={isPositive ? "#22c55e" : "#ef4444"}
                                                                    strokeWidth={2.5}
                                                                    dot={false}
                                                                    animationDuration={1500}
                                                                />
                                                            );
                                                        })()}
                                                        <YAxis hide domain={['dataMin', 'dataMax']} />
                                                        <Tooltip
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    return (
                                                                        <div className="bg-white border border-slate-200 shadow-xl rounded-lg px-2 py-1 text-[10px] font-bold">
                                                                            Stock: {payload[0].value}
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-300 italic">
                                                    Sin historial
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <button className="bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white px-4 py-2 rounded-xl text-[11px] font-bold transition-all border border-blue-600/20 active:scale-95 flex items-center gap-2 ml-auto">
                                            Detalles
                                            <ExternalLink size={12} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {!isEmpty && (
                <div className="bg-slate-50/50 px-8 py-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="text-[11px] text-slate-400 font-medium">
                        📊 <span className="ml-2">Visualización de disponibilidad y evolución de stock por producto.</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                        Mostrando <span className="text-slate-600 font-bold">{results.length}</span> productos encontrados
                    </div>
                </div>
            )}
        </div>
    );
}
