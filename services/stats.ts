import { WebSocket } from 'ws';
import { ClientInfo } from '../types/websocket';

export interface LiveStats {
  activeListeners: number;
  geotaggedListeners: number;
  anonymousListeners: number;
  listenersByCountry: Record<string, number>;
  locations: Array<[number, number]>;
}

let clients = new Map<WebSocket, ClientInfo>();

export function getClients() {
  return clients;
}

export function setClients(newClients: Map<WebSocket, ClientInfo>) {
  clients = newClients;
}

export function getLiveStats(): LiveStats {
  const activePlayers = Array.from(clients.values()).filter(info => info.isPlaying);
  const geotagged = activePlayers.filter(info => info.coordinates).length;

  const countryStats: Record<string, number> = {};
  const locations: Array<[number, number]> = [];

  activePlayers.forEach(player => {
    if (player.countryCode) {
      countryStats[player.countryCode] = (countryStats[player.countryCode] || 0) + 1;
    }
    if (player.coordinates) {
      console.log('Adding location to stats:', player.coordinates);
      locations.push([player.coordinates.lat, player.coordinates.lng]);
    }
  });

  const stats = {
    activeListeners: activePlayers.length,
    geotaggedListeners: geotagged,
    anonymousListeners: activePlayers.length - geotagged,
    listenersByCountry: countryStats,
    locations
  };

  console.log('Generated stats:', stats);
  return stats;
}

export function broadcastStats() {
  const stats = getLiveStats();
  const message = JSON.stringify({
    type: 'stats_update',
    data: stats
  });

  Array.from(clients.keys()).forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending stats update:', error);
        clients.delete(client);
      }
    }
  });
}