import { useState, useEffect, useCallback } from 'react';

const useOfflineSync = ({ onSync, storageKey = 'sync_queue' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Carregar fila do localStorage
  useEffect(() => {
    const savedQueue = localStorage.getItem(storageKey);
    if (savedQueue) {
      setQueue(JSON.parse(savedQueue));
    }
  }, [storageKey]);

  // Salvar fila no localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(queue));
  }, [queue, storageKey]);

  // Monitorar conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Tentar sincronizar automaticamente
      if (queue.length > 0) {
        syncNow();
      }
    };
    
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue]);

  const addToQueue = useCallback((item) => {
    setQueue(prev => [...prev, {
      ...item,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random().toString(36).substr(2, 9)
    }]);
  }, []);

  const syncNow = useCallback(async () => {
    if (queue.length === 0 || !isOnline || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      // Processar itens em lote
      const successItems = [];
      const failedItems = [];
      
      for (const item of queue) {
        try {
          await onSync(item);
          successItems.push(item);
        } catch (error) {
          console.error('Erro ao sincronizar item:', item, error);
          failedItems.push(item);
        }
      }
      
      // Atualizar fila removendo itens sincronizados com sucesso
      setQueue(failedItems);
      
      return {
        success: successItems.length,
        failed: failedItems.length,
        total: queue.length
      };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [queue, isOnline, onSync, isSyncing]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    isOnline,
    queue,
    isSyncing,
    syncQueue: {
      add: addToQueue,
      list: queue,
      clear: clearQueue,
      length: queue.length
    },
    syncNow,
    clearQueue
  };
};

export default useOfflineSync;