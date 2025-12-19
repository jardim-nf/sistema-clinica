import React, { createContext, useState, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 3000 }) => {
    const id = Date.now();
    const newToast = {
      id,
      message,
      type,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const value = {
    addToast,
    removeToast,
    toasts
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  
  // Retornar tanto addToast quanto toast (com métodos auxiliares)
  const { addToast, removeToast, toasts } = context;
  
  const toast = {
    success: (message, duration = 3000) => 
      addToast({ message, type: 'success', duration }),
    error: (message, duration = 3000) => 
      addToast({ message, type: 'error', duration }),
    warning: (message, duration = 3000) => 
      addToast({ message, type: 'warning', duration }),
    info: (message, duration = 3000) => 
      addToast({ message, type: 'info', duration }),
    custom: addToast
  };

  return {
    toast,      // Métodos auxiliares: toast.success(), toast.error(), etc.
    addToast,   // Função direta para compatibilidade
    removeToast,
    toasts
  };
};

// Componente ToastContainer
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  const getColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-400 text-green-700';
      case 'error': return 'bg-red-100 border-red-400 text-red-700';
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'info': return 'bg-blue-100 border-blue-400 text-blue-700';
      default: return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getColor(toast.type)} border px-4 py-3 rounded-lg shadow-lg flex items-center justify-between animate-fadeIn`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-lg font-bold opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

// Adicione este CSS no seu index.css
// @keyframes fadeIn {
//   from { opacity: 0; transform: translateY(-10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-fadeIn {
//   animation: fadeIn 0.3s ease-out;
// }