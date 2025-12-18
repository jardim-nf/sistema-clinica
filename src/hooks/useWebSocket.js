import { useEffect, useState, useCallback } from 'react';

const useWebSocket = ({ url, onMessage, reconnectAttempts = 5 }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setReconnectCount(0);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        setLastUpdate(new Date());
        onMessage?.(data);
      };
      
      ws.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        
        // Tentar reconectar
        if (reconnectCount < reconnectAttempts) {
          setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, 3000 * (reconnectCount + 1)); // Backoff exponencial
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      setSocket(ws);
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
    }
  }, [url, onMessage, reconnectCount, reconnectAttempts]);

  const send = useCallback((data) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, [socket, isConnected]);

  useEffect(() => {
    connect();
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [url]); // Reconectar se URL mudar

  const reconnect = () => {
    if (socket) {
      socket.close();
    }
    connect();
  };

  return {
    socket,
    isConnected,
    lastMessage,
    lastUpdate,
    reconnectCount,
    send,
    reconnect
  };
};

export default useWebSocket;