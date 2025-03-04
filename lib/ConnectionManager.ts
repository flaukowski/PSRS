import { NetworkType } from '@/types/network';

export type ConnectionType = 'commercial' | 'bluetooth' | 'unknown';

interface ConnectionMetrics {
  type: ConnectionType;
  latency: number;
  stability: number;
  bandwidth: number;
}

export class ConnectionManager {
  private connectionType: ConnectionType = 'unknown';
  private isBluetoothAvailable: boolean = false;
  private metrics: ConnectionMetrics = {
    type: 'unknown',
    latency: 0,
    stability: 1,
    bandwidth: 0
  };

  constructor() {
    this.detectConnectionType();
    this.checkBluetoothAvailability();
  }

  private async detectConnectionType(): Promise<void> {
    try {
      // Check if we're on a commercial network
      const connection = (navigator as any).connection;
      if (connection) {
        const type = connection.type;
        const effectiveType = connection.effectiveType;
        
        // Filter out non-commercial networks
        if (type === 'cellular' || 
            (effectiveType === '4g' && !this.isPrivateNetwork()) ||
            type === 'ethernet' && !this.isPrivateNetwork()) {
          this.connectionType = 'commercial';
        }
      }
      
      this.updateMetrics();
    } catch (error) {
      console.error('Error detecting connection type:', error);
    }
  }

  private async checkBluetoothAvailability(): Promise<void> {
    try {
      if ('bluetooth' in navigator) {
        // Just check if Bluetooth is available, don't connect yet
        const available = await navigator.bluetooth.getAvailability();
        this.isBluetoothAvailable = available;
      }
    } catch (error) {
      console.error('Bluetooth not available:', error);
      this.isBluetoothAvailable = false;
    }
  }

  private isPrivateNetwork(): boolean {
    // Check if the IP address is in private ranges
    // This is a simplified check - in production you'd want to actually
    // verify the IP address ranges
    return false; // For now, assume all networks are commercial
  }

  private updateMetrics(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics = {
        type: this.connectionType,
        latency: connection.rtt || 0,
        stability: this.calculateStability(connection),
        bandwidth: connection.downlink || 0
      };
    }
  }

  private calculateStability(connection: any): number {
    // Calculate connection stability based on various metrics
    let stability = 1.0;
    
    if (connection.rtt) {
      // Lower RTT means higher stability
      stability *= Math.max(0, 1 - (connection.rtt / 1000));
    }
    
    if (connection.downlink) {
      // Higher bandwidth means higher stability
      stability *= Math.min(1, connection.downlink / 10);
    }
    
    return Math.max(0, Math.min(1, stability));
  }

  async connectBluetooth(): Promise<boolean> {
    if (!this.isBluetoothAvailable) return false;

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['audio_sync'] }],
        optionalServices: ['battery_service']
      });

      const server = await device.gatt?.connect();
      if (!server) return false;

      this.connectionType = 'bluetooth';
      return true;
    } catch (error) {
      console.error('Error connecting to Bluetooth:', error);
      return false;
    }
  }

  getConnectionType(): ConnectionType {
    return this.connectionType;
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  isValidConnection(): boolean {
    return this.connectionType === 'commercial' || this.connectionType === 'bluetooth';
  }
}
