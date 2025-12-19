import { useState, useCallback } from 'react';

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((config) => {
    const id = Date.now();
    const newToast = {
      id,
      message: config.message,
      type: config.type || 'info',
      title: config.title || '',
      duration: config.duration || 3000
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remover após duração
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, newToast.duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Métodos auxiliares
  const toast = {
    success: (message, title) => addToast({ message, type: 'success', title }),
    error: (message, title) => addToast({ message, type: 'error', title }),
    warning: (message, title) => addToast({ message, type: 'warning', title }),
    info: (message, title) => addToast({ message, type: 'info', title }),
    custom: (config) => addToast(config)
  };

  return {
    toasts,
    addToast,
    toast,
    removeToast
  };
};

export default useToast;