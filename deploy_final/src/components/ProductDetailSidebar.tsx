'use client';

import { X, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProductDetailView from './ProductDetailView';
import Link from 'next/link';

interface ProductDetailSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    product: any; // Initial product data (from table)
}

export default function ProductDetailSidebar({ isOpen, onClose, product }: ProductDetailSidebarProps) {
    const [isVisible, setIsVisible] = useState(false);

    // Handle animation
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden'; // Prevent scrolling bg
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for transition
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end font-sans">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <div
                className={`relative w-full max-w-md bg-white h-full shadow-2xl border-l border-white/50 transform transition-transform duration-300 ease-out bg-opacity-95 backdrop-blur-xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header Actions */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                    {product && (
                        <Link
                            href={`/product/${product.id}`}
                            className="p-2 bg-white/50 hover:bg-white text-slate-500 hover:text-blue-600 rounded-full border border-slate-100 transition-colors shadow-sm"
                            title="Abrir página completa"
                        >
                            <ExternalLink size={18} />
                        </Link>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/50 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-full border border-slate-100 transition-colors shadow-sm bg-opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="h-full overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
                    {product ? (
                        <div className="pt-8">
                            <ProductDetailView
                                product={product}
                                productId={product.id}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            Cargando...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
