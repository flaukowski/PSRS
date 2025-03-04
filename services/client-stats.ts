import { WebSocket } from 'ws';
import type { ClientInfo } from '../types/websocket';

// In-memory store for client stats
let clientStatsCache = {
  activeListeners: 0,
  geotaggedListeners: 0,
  anonymousListeners: 0,
  listenersByCountry: {} as Record<string, number>,
};

// Client map to store WebSocket connections and their data
const clients = new Map<WebSocket, ClientInfo>();

export function getClients() {
  return clients;
}

export function updateClientStats() {
  // Only count clients with open connections
  const activeClients = Array.from(clients.entries())
    .filter(([ws]) => ws.readyState === WebSocket.OPEN)
    .map(([_, info]) => info);

  const geotaggedClients = activeClients.filter(client => 
    client.coordinates && client.countryCode && client.isPlaying
  );

  const listenersByCountry: Record<string, number> = {};

  // Calculate listeners by country
  geotaggedClients.forEach(client => {
    if (client.countryCode) {
      listenersByCountry[client.countryCode] = (listenersByCountry[client.countryCode] || 0) + 1;
    }
  });

  // Update cache with new stats
  clientStatsCache = {
    activeListeners: activeClients.length,
    geotaggedListeners: geotaggedClients.length,
    anonymousListeners: activeClients.length - geotaggedClients.length,
    listenersByCountry,
  };

  console.log('Generated stats:', {
    ...clientStatsCache,
    locations: geotaggedClients.map(client => client.coordinates)
  });

  return clientStatsCache;
}

export function getClientStats() {
  return updateClientStats(); // Always return fresh stats
}

export function addClient(ws: WebSocket, info: ClientInfo) {
  clients.set(ws, info);
  updateClientStats();
}

export function removeClient(ws: WebSocket) {
  clients.delete(ws);
  updateClientStats();
}

export function updateClient(ws: WebSocket, info: Partial<ClientInfo>) {
  const existingInfo = clients.get(ws);
  if (existingInfo) {
    clients.set(ws, { ...existingInfo, ...info });
    updateClientStats();
  }
}

// Broadcast updated stats to all connected clients
export function broadcastStats() {
  const stats = getClientStats();
  const message = JSON.stringify({
    type: 'stats_update',
    data: stats,
  });

  for (const [ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (error) {
        console.error('Error broadcasting stats:', error);
        removeClient(ws);
      }
    }
  }
}