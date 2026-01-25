
"use client";


import { ExternalLink, Info, Package, Pill, ShoppingCart, MoreVertical, Edit } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProductEditModal from './ProductEditModal';

interface ProductResult {
    id: string;
    name: string;
    clean_name?: string;
    brand: string;
    atc: string;
    concentration: string;
    presentation: string;
    image: string;
    is_pharma?: boolean;
    active_ingredient?: string;
    classification?: string;
    history: { date: string, value: number }[];
}

interface SearchResultsTableProps {
    results: ProductResult[];
    isVisible: boolean;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    onRowClick?: (product: ProductResult) => void;
}


export default function SearchResultsTable({ results, isVisible, hasMore, isLoadingMore, onLoadMore, onRowClick }: SearchResultsTableProps) {
    const isEmpty = results.length === 0;
    const [editingProduct, setEditingProduct] = useState<ProductResult | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleEditClick = (e: React.MouseEvent, product: ProductResult) => {
        e.stopPropagation();
        setOpenMenuId(null);
        setEditingProduct(product);
        setIsEditModalOpen(true);
    };

    const handleMenuClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleUserUpdate = async (id: string, data: { clean_name: string; presentation: string; concentration: string }) => {
        // Optimistic UI update could be done here, but better to wait for server success or just reload/refetch.
        // For now, let's call the API.
        const res = await fetch('/api/products/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data })
        });

        if (!res.ok) throw new Error('Failed to update');

        // Force a page reload to see changes or we could accept a callback to refetch data. 
        // Since this component receives results as props, the parent should verify.
        // However, a simple window reload is the easiest distinct way to "reflect in the list".
        window.location.reload();
    };

    return (
        <>
            <div className="glass-panel mt-6 rounded-3xl overflow-hidden border border-slate-100 shadow-sm transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                                <th className="px-6 py-5 font-bold">Producto</th>
                                <th className="px-6 py-5 font-bold">Presentación</th>
                                <th className="px-6 py-5 font-bold">Concentración</th>

                                <th className="px-8 py-5 font-bold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isEmpty ? (
                                <tr>
                                    <td colSpan={4} className="py-24 text-center">
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
                                    <tr
                                        key={product.id}
                                        onClick={() => onRowClick && onRowClick(product)}
                                        className="hover:bg-blue-50/50 hover:shadow-lg hover:-translate-y-1 hover:z-10 relative transition-all duration-300 ease-in-out group cursor-pointer border-slate-100 hover:border-blue-200 border-b"
                                    >
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
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {product.is_pharma ? (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-tight">
                                                                <Pill size={10} />
                                                                Fármaco
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-tight">
                                                                <ShoppingCart size={10} />
                                                                Consumo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-800 line-clamp-1" title={product.clean_name || product.name}>
                                                        {product.clean_name || product.name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
                                                        {product.active_ingredient && (
                                                            <span className="text-blue-600 font-semibold mr-1">
                                                                P.A: {product.active_ingredient} •
                                                            </span>
                                                        )}
                                                        {product.brand} • {product.atc || 'Sin código ATC'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                                                {product.presentation || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-slate-600">
                                                {product.concentration || 'N/A'}
                                            </span>
                                        </td>

                                        <td className="px-8 py-4 text-right relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMenuClick(e, product.id);
                                                }}
                                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {/* Custom Dropdown Menu */}
                                            {openMenuId === product.id && (
                                                <div className="absolute right-8 top-12 z-10 w-40 bg-white rounded-xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-left">
                                                    <div className="py-1">
                                                        <button
                                                            onClick={(e) => handleEditClick(e, product)}
                                                            className="w-full px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Edit size={14} className="text-blue-500" />
                                                            Editar
                                                        </button>
                                                        <Link
                                                            href={`/product/${product.id}`}
                                                            className="w-full px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <ExternalLink size={14} className="text-slate-400" />
                                                            Ver Detalles
                                                        </Link>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {hasMore && (
                    <div className="p-4 flex justify-center border-t border-slate-100 bg-slate-50/30">
                        <button
                            onClick={onLoadMore}
                            disabled={isLoadingMore}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-600 font-medium hover:bg-slate-50 hover:border-blue-300 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoadingMore ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-blue-500">Cargando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm">Cargar más productos</span>
                                    <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-slate-400">
                                        <MoreVertical size={14} />
                                    </div>
                                </>
                            )}
                        </button>
                    </div>
                )}

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

            {editingProduct && (
                <ProductEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    product={editingProduct as any} // Type assertion if needed, but structures match
                    onSave={handleUserUpdate}
                />
            )
            }
        </>
    );
}
