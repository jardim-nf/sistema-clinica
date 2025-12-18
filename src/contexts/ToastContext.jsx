import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Adiciona um novo toast (RENOMEADO PARA showToast)
  const showToast = useCallback(({ message, type = 'success', duration = 3000 }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    // Remove automaticamente após o tempo
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  }, []);

  // Remove manualmente
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}> {/* VALOR CORRIGIDO */}
      {children}
      
      {/* Container dos Toasts (Fica flutuando sobre tudo) */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl transform transition-all animate-in slide-in-from-right border border-l-4 min-w-[300px] bg-white
              ${toast.type === 'success' ? 'border-l-green-500' : 
                toast.type === 'error' ? 'border-l-red-500' : 'border-l-blue-500'}`}
          >
            <div className={`p-2 rounded-full ${
                toast.type === 'success' ? 'bg-green-100 text-green-600' : 
                toast.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {toast.type === 'success' && <CheckCircle size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </div>
            
            <div className="flex-1">
              <h4 className="font-bold text-sm text-slate-800 capitalize">
                {toast.type === 'error' ? 'Atenção' : toast.type === 'success' ? 'Sucesso' : 'Info'}
              </h4>
              <p className="text-sm text-slate-500">{toast.message}</p>
            </div>

            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}