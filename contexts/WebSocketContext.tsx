import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import SecureWebSocket from '@/lib/websocket';

interface WebSocketContextType {
  socket: SecureWebSocket | null;
  isConnected: boolean;
  connectionQuality: number;
  dimensionalLatency: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  connectionQuality: 1,
  dimensionalLatency: 0
});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<SecureWebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(1);
  const [dimensionalLatency, setDimensionalLatency] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { address } = useAccount();

  const connect = () => {
    try {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new SecureWebSocket(wsUrl);

      ws.onMessage((data) => {
        try {
          if (data.type === 'dimensional_error') {
            console.error('Dimensional portal error:', data.message);
          } else if (data.type === 'dimensional_pong') {
            const latency = Date.now() - (data.timestamp || 0);
            const quality = Math.max(0, Math.min(1, 1 - (latency / 1000)));
            setConnectionQuality(quality);
            setDimensionalLatency(latency);
          }
        } catch (error) {
          console.error('Error processing dimensional message:', error);
        }
      });

      ws.onClose(() => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setSocket(null);
        setConnectionQuality(0);

        // Attempt to reconnect with exponential backoff
        if (!reconnectTimeoutRef.current) {
          const delay = Math.min(1000 * Math.pow(2, ws.reconnectAttempts || 0), 30000);
          console.log(`Attempting reconnect in ${delay}ms`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = undefined;
            connect();
          }, delay);
        }
      });

      setSocket(ws);
      setIsConnected(true);

      // Initial auth if we have an address
      if (address) {
        ws.send({
          type: 'auth',
          address,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setSocket(null);
      setIsConnected(false);
      setConnectionQuality(0);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    if (address && socket && isConnected) {
      socket.send({
        type: 'auth',
        address,
        timestamp: Date.now()
      });
    }
  }, [address, socket, isConnected]);

  return (
    <WebSocketContext.Provider value={{ 
      socket, 
      isConnected, 
      connectionQuality,
      dimensionalLatency 
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};