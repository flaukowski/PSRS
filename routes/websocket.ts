import { WebSocket, WebSocketServer } from 'ws';
import type { WebSocketMessage, ClientInfo } from '../types/websocket';
import { getClientStats, updateClient, addClient, removeClient, broadcastStats as broadcastClientStats } from '../services/client-stats';
import wsHealthService from '../services/websocket-health';
import { establishSecureChannel } from '../services/encryption';

// Track connected clients and their song subscriptions
const clients = new Map<WebSocket, ClientInfo>();

// Function to find the leader client
function findLeaderClient(): [WebSocket, ClientInfo] | undefined {
  let earliestConnection: [WebSocket, ClientInfo] | undefined;

  // Use Array.from to avoid TypeScript iteration issues
  Array.from(clients.entries()).forEach(([ws, info]) => {
    if (ws.readyState === WebSocket.OPEN && 
        (!earliestConnection || info.connectedAt < earliestConnection[1].connectedAt)) {
      earliestConnection = [ws, info];
    }
  });

  return earliestConnection;
}

// Function to update leader status after connection changes
function updateLeaderStatus() {
  const leader = findLeaderClient();

  Array.from(clients.entries()).forEach(([ws, info]) => {
    if (ws.readyState === WebSocket.OPEN) {
      const isLeader = leader && ws === leader[0];
      info.isLeader = isLeader;

      try {
        ws.send(JSON.stringify({
          type: 'leader_update',
          isLeader
        }));
      } catch (error) {
        console.error('Error sending leader update:', error);
      }
    }
  });
}

// Function to find current leader's playback state
function getLeaderState(): { songId?: number; timestamp: number; playing: boolean } | undefined {
  const leader = findLeaderClient();
  if (!leader) return undefined;

  const [_, info] = leader;
  return {
    songId: info.currentSong,
    timestamp: info.currentTime || 0,
    playing: info.isPlaying || false
  };
}

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws, req) => {
    console.log('New client connected from:', req.socket.remoteAddress);

    // Initialize client info with connection timestamp
    const clientInfo: ClientInfo = {
      connectedAt: Date.now(),
      isLeader: clients.size === 0, // First client becomes leader
      lastSyncTime: Date.now()
    };

    // Add client to our tracking
    addClient(ws, clientInfo);
    updateLeaderStatus();

    // Add to health monitoring
    wsHealthService.addConnection(ws);

    // Send initial stats to the new client
    try {
      ws.send(JSON.stringify({
        type: 'stats_update',
        data: getClientStats()
      }));
    } catch (error) {
      console.error('Error sending initial stats:', error);
    }

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        console.log('Received message type:', message.type);

        switch (message.type) {
          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
          case 'auth': {
            if (message.address) {
              const normalizedAddress = message.address.toLowerCase();
              updateClient(ws, { address: normalizedAddress });
              ws.send(JSON.stringify({ type: 'auth_success' }));
              broadcastClientStats();
              console.log('Client authenticated:', normalizedAddress);
            }
            break;
          }
          case 'subscribe': {
            if (message.songId) {
              updateClient(ws, { currentSong: message.songId });
              ws.send(JSON.stringify({ 
                type: 'subscribe_success',
                songId: message.songId 
              }));

              // Send immediate sync state if available
              const leaderState = getLeaderState();
              if (leaderState && leaderState.songId === message.songId) {
                ws.send(JSON.stringify({
                  type: 'sync',
                  ...leaderState
                }));
              }
            }
            break;
          }
          case 'request_sync': {
            const leaderState = getLeaderState();
            if (leaderState && leaderState.songId === message.songId) {
              ws.send(JSON.stringify({
                type: 'sync',
                ...leaderState
              }));
            }
            break;
          }
          case 'sync': {
            const { timestamp, playing, songId } = message;
            updateClient(ws, { 
              isPlaying: playing, 
              currentTime: timestamp,
              lastSyncTime: Date.now()
            });

            const clientInfo = clients.get(ws);
            if (clientInfo?.isLeader) {
              if (!playing) {
                updateClient(ws, { coordinates: undefined, countryCode: undefined });
              }

              // Get connection health before broadcasting
              const health = wsHealthService.getConnectionHealth(ws);
              if (health && health.quality > 0.5) { // Only broadcast if connection quality is good
                const syncMessage = JSON.stringify({
                  type: 'sync',
                  timestamp,
                  playing,
                  songId,
                  quality: health.quality
                });

                // Enhanced sync broadcast with health consideration
                Array.from(clients.entries()).forEach(([client, info]) => {
                  const clientHealth = wsHealthService.getConnectionHealth(client);
                  if (client !== ws && 
                      info.currentSong === songId && 
                      client.readyState === WebSocket.OPEN &&
                      clientHealth?.quality && clientHealth.quality > 0.3) {
                    try {
                      client.send(syncMessage);
                    } catch (error) {
                      console.error('Error sending sync message:', error);
                      removeClient(client);
                    }
                  }
                });
              }
            }
            break;
          }
          case 'location_update': {
            const { coordinates, countryCode } = message;
            console.log('Received location update:', { coordinates, countryCode });

            if (coordinates && countryCode) {
              updateClient(ws, { coordinates, countryCode });
              ws.send(JSON.stringify({ 
                type: 'location_update_success',
                coordinates,
                countryCode 
              }));
              broadcastClientStats();
            } else {
              console.log('Invalid location update - missing coordinates or country code');
              ws.send(JSON.stringify({ 
                type: 'error',
                message: 'Invalid location data'
              }));
            }
            break;
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error processing message'
          }));
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    });

    // Handle connection health events
    wsHealthService.on('connectionUnhealthy', (unhealthyWs) => {
      if (unhealthyWs === ws) {
        console.log('Connection became unhealthy:', req.socket.remoteAddress);
        removeClient(ws);
        updateLeaderStatus();
        broadcastClientStats();
      }
    });

    wsHealthService.on('qualityUpdate', (updatedWs, quality) => {
      if (updatedWs === ws) {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
          updateClient(ws, { connectionQuality: quality });
          if (clientInfo.isLeader && quality < 0.3) {
            updateLeaderStatus();
          }
        }
      }
    });

    ws.on('close', (code, reason) => {
      console.log('Client disconnected:', code, reason.toString());
      wsHealthService.removeConnection(ws);
      removeClient(ws);
      updateLeaderStatus();
      broadcastClientStats();
    });
  });

  return {
    clients,
    findLeaderClient,
    updateLeaderStatus,
    getLeaderState
  };
}