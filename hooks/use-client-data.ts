import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import type { ClientInfo } from "@/types/websocket";

export interface ClientData {
  activeListeners: number;
  geotaggedListeners: number;
  anonymousListeners: number;
  listenersByCountry: Record<string, number>;
}

export function useClientData() {
  const queryClient = useQueryClient();
  const ws = useWebSocket();

  // Query for initial stats
  const { data: clientStats, isLoading, error } = useQuery<ClientData>({
    queryKey: ["/api/clients/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'stats_update') {
        queryClient.setQueryData(["/api/clients/stats"], message.data);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [queryClient]);

  // Listen for WebSocket updates
  useEffect(() => {
    if (!ws) return;

    ws.addEventListener('message', handleWebSocketMessage);
    return () => ws.removeEventListener('message', handleWebSocketMessage);
  }, [ws, handleWebSocketMessage]);

  // Send geolocation updates
  useEffect(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    let watchId: number;

    const startGeolocation = () => {
      if ('geolocation' in navigator) {
        console.log('Starting geolocation watch...');
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            console.log('Got position:', { latitude, longitude });

            try {
              // Default to USA for development (you may want to change this)
              const countryCode = 'USA';

              ws.send(JSON.stringify({
                type: 'location_update',
                coordinates: { lat: latitude, lng: longitude },
                countryCode
              }));
            } catch (error) {
              console.error('Error sending location update:', error);
            }
          },
          (error) => {
            console.error('Geolocation error:', error);
            // Handle specific error cases
            switch(error.code) {
              case error.PERMISSION_DENIED:
                console.log('User denied geolocation permission');
                break;
              case error.POSITION_UNAVAILABLE:
                console.log('Location information unavailable');
                break;
              case error.TIMEOUT:
                console.log('Location request timeout');
                break;
            }
          },
          { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    };

    startGeolocation();

    // Cleanup
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [ws]);

  return {
    clientStats: clientStats || {
      activeListeners: 0,
      geotaggedListeners: 0,
      anonymousListeners: 0,
      listenersByCountry: {},
    },
    isLoading,
    error,
  };
}