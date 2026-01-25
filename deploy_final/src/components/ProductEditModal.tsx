"use client";

import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';

interface ProductEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        id: string;
        clean_name: string;
        presentation: string;
        concentration: string;
    };
    onSave: (id: string, data: { clean_name: string; presentation: string; concentration: string }) => Promise<void>;
}

export default function ProductEditModal({ isOpen, onClose, product, onSave }: ProductEditModalProps) {
    const [formData, setFormData] = useState({
        clean_name: '',
        presentation: '',
        concentration: ''
    });
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && product) {
            setFormData({
                clean_name: product.clean_name || '',
                presentation: product.presentation || '',
                concentration: product.concentration || ''
            });
            setShowConfirm(false);
        }
    }, [isOpen, product]);

    if (!isOpen) return null;

    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const handleConfirmSave = async () => {
        setIsSaving(true);
        try {
            await onSave(product.id, formData);
            onClose();
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setIsSaving(false);
            setShowConfirm(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 ${showConfirm ? 'scale-95 opacity-50 blur-[1px]' : 'scale-100'}`}>
                <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Editar Producto</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveClick} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Producto</label>
                        <input
                            type="text"
                            value={formData.clean_name}
                            onChange={(e) => setFormData({ ...formData, clean_name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Nombre limpio..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presentación</label>
                            <input
                                type="text"
                                value={formData.presentation}
                                onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="Ej: Tabletas"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Concentración</label>
                            <input
                                type="text"
                                value={formData.concentration}
                                onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="Ej: 500 mg"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Save size={14} />
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>

            {/* Confirmation Dialog Overlay */}
            {showConfirm && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center animate-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-[320px] p-6 text-center border border-slate-100">
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 border border-amber-100">
                            <AlertTriangle size={24} />
                        </div>
                        <h4 className="font-bold text-slate-800 text-lg mb-2">¿Confirmar cambios?</h4>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            ¿Realmente desea modificar los datos de este producto en la base de datos?
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={isSaving}
                                className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex-1"
                            >
                                No, cancelar
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                disabled={isSaving}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex-1"
                            >
                                {isSaving ? 'Guardando...' : 'Sí, guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
