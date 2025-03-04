import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface ConnectionHealth {
  lastPing: number;
  lastPong: number;
  latency: number;
  quality: number;
  missedHeartbeats: number;
}

class WebSocketHealthService extends EventEmitter {
  private connections: Map<WebSocket, ConnectionHealth>;
  private heartbeatInterval: NodeJS.Timeout | null;
  private readonly HEARTBEAT_INTERVAL = 1000; // 1 second
  private readonly MAX_MISSED_HEARTBEATS = 3;

  constructor() {
    super();
    this.connections = new Map();
    this.heartbeatInterval = null;
    this.startHeartbeatMonitoring();
  }

  private startHeartbeatMonitoring() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.checkConnections();
    }, this.HEARTBEAT_INTERVAL);
  }

  private checkConnections() {
    const now = Date.now();
    
    for (const [ws, health] of this.connections.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        // Send ping if we haven't received a pong recently
        if (now - health.lastPong > this.HEARTBEAT_INTERVAL) {
          health.lastPing = now;
          health.missedHeartbeats++;
          
          try {
            ws.send(JSON.stringify({ type: 'ping', timestamp: now }));
          } catch (error) {
            console.error('Error sending heartbeat:', error);
            this.handleConnectionFailure(ws);
          }
        }

        // Check for stale connections
        if (health.missedHeartbeats >= this.MAX_MISSED_HEARTBEATS) {
          this.handleConnectionFailure(ws);
        }

        // Update connection quality based on latency and missed heartbeats
        this.updateConnectionQuality(ws, health);
      }
    }
  }

  private updateConnectionQuality(ws: WebSocket, health: ConnectionHealth) {
    // Calculate quality score (0-1) based on latency and reliability
    const latencyScore = Math.max(0, 1 - (health.latency / 1000)); // Penalize latency over 1000ms
    const reliabilityScore = Math.max(0, 1 - (health.missedHeartbeats / this.MAX_MISSED_HEARTBEATS));
    
    health.quality = (latencyScore + reliabilityScore) / 2;
    
    // Emit quality update event
    this.emit('qualityUpdate', ws, health.quality);
  }

  private handleConnectionFailure(ws: WebSocket) {
    this.emit('connectionUnhealthy', ws);
    this.removeConnection(ws);
  }

  addConnection(ws: WebSocket) {
    this.connections.set(ws, {
      lastPing: Date.now(),
      lastPong: Date.now(),
      latency: 0,
      quality: 1,
      missedHeartbeats: 0
    });

    // Set up pong handler for this connection
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          this.handlePong(ws, message.timestamp);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
  }

  removeConnection(ws: WebSocket) {
    this.connections.delete(ws);
  }

  private handlePong(ws: WebSocket, pingTimestamp: number) {
    const health = this.connections.get(ws);
    if (health) {
      const now = Date.now();
      health.lastPong = now;
      health.latency = now - pingTimestamp;
      health.missedHeartbeats = 0;
      this.updateConnectionQuality(ws, health);
    }
  }

  getConnectionHealth(ws: WebSocket): ConnectionHealth | undefined {
    return this.connections.get(ws);
  }

  getAggregateStats() {
    const stats = {
      totalConnections: this.connections.size,
      averageLatency: 0,
      averageQuality: 0,
      healthyConnections: 0
    };

    if (this.connections.size === 0) return stats;

    let totalLatency = 0;
    let totalQuality = 0;

    for (const health of this.connections.values()) {
      totalLatency += health.latency;
      totalQuality += health.quality;
      if (health.quality > 0.7) { // Consider connections with quality > 0.7 as healthy
        stats.healthyConnections++;
      }
    }

    stats.averageLatency = totalLatency / this.connections.size;
    stats.averageQuality = totalQuality / this.connections.size;

    return stats;
  }

  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.connections.clear();
  }
}

// Create singleton instance
const wsHealthService = new WebSocketHealthService();

export default wsHealthService;
