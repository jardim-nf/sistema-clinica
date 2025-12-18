// src/components/ConfirmModal.jsx

import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

const ConfirmModal = ({ title, message, onConfirm, onCancel, confirmText = 'Confirmar', type = 'warning' }) => {
    const isWarning = type === 'warning';
    
    const Icon = isWarning ? AlertTriangle : CheckCircle;
    const colorClass = isWarning ? 'text-orange-500' : 'text-green-500';
    const buttonClass = isWarning ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700';

    return (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <Icon size={24} className={colorClass} />
                        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Renderiza negrito de forma segura */}
                <p className="text-sm text-slate-600 mb-6" 
                   dangerouslySetInnerHTML={{ __html: message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                />

                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={onCancel} 
                        className="px-4 py-2 text-slate-600 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className={`px-4 py-2 text-white rounded-lg ${buttonClass} transition-colors`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;