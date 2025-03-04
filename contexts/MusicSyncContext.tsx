import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useMusicPlayer } from './MusicPlayerContext';
import { CascadeController, type CascadeMetrics } from '@/lib/CascadeController';
import { ConnectionManager, type ConnectionType } from '@/lib/ConnectionManager';
import { AudioBufferController, type AudioQualityMetrics } from '@/lib/AudioBufferController';

export interface NetworkNode {
  id: string;
  latency: number;
  syncError: number;
  playbackRate: number;
  connectionType: ConnectionType;
}

interface MusicSyncContextType {
  syncEnabled: boolean;
  toggleSync: () => void;
  updateMetadata: (songId: number, metadata: { title: string; artist: string }) => Promise<void>;
  cascadeMetrics: CascadeMetrics;
  audioMetrics: AudioQualityMetrics;
  connectedNodes: NetworkNode[];
  updateControlParameters: (params: {
    innerLoop: { kp: number; ki: number; kd: number };
    outerLoop: { kp: number; ki: number; kd: number };
  }) => void;
  connectionType: ConnectionType;
  switchToBluetoothSync: () => Promise<boolean>;
}

const MusicSyncContext = createContext<MusicSyncContextType | undefined>(undefined);

const DEFAULT_METRICS: AudioQualityMetrics = {
  bufferHealth: 1,
  playbackStability: 1,
  dropoutCount: 0,
  jitterMs: 0
};

const DEFAULT_CASCADE_METRICS: CascadeMetrics = {
  entropyError: 0,
  freeEnergyError: 0,
  entropyOutput: 0,
  freeEnergyOutput: 0,
  entropyIntegral: 0,
  freeEnergyIntegral: 0,
  entropyDerivative: 0,
  freeEnergyDerivative: 0
};

export function MusicSyncProvider({ children }: { children: React.ReactNode }) {
  // Basic state management
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [connectedNodes, setConnectedNodes] = useState<NetworkNode[]>([]);
  const [audioMetrics, setAudioMetrics] = useState<AudioQualityMetrics>(DEFAULT_METRICS);
  const [cascadeMetrics, setCascadeMetrics] = useState<CascadeMetrics>(DEFAULT_CASCADE_METRICS);

  // Refs for controllers and connection
  const wsRef = useRef<WebSocket | null>(null);
  const cascadeControllerRef = useRef<CascadeController | null>(null);
  const connectionManagerRef = useRef<ConnectionManager | null>(null);
  const audioBufferControllerRef = useRef<AudioBufferController | null>(null);

  // Authentication and player state
  const { address } = useAccount();
  const { currentSong, isPlaying } = useMusicPlayer();
  const isAuthenticated = Boolean(address);

  // Reconnection state
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize controllers only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (!cascadeControllerRef.current) {
        cascadeControllerRef.current = new CascadeController();
      }
      if (!connectionManagerRef.current) {
        connectionManagerRef.current = new ConnectionManager();
      }
      if (!audioBufferControllerRef.current) {
        const audioContext = new AudioContext();
        audioBufferControllerRef.current = new AudioBufferController(audioContext);
      }
    }
  }, [isAuthenticated]);

  // Monitor audio quality metrics only when sync is enabled
  useEffect(() => {
    if (!syncEnabled || !isAuthenticated || !audioBufferControllerRef.current) return;

    const interval = setInterval(() => {
      if (audioBufferControllerRef.current) {
        setAudioMetrics(audioBufferControllerRef.current.getMetrics());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [syncEnabled, isAuthenticated]);

  const updateControlParameters = (params: {
    innerLoop: { kp: number; ki: number; kd: number };
    outerLoop: { kp: number; ki: number; kd: number };
  }) => {
    if (!isAuthenticated || !cascadeControllerRef.current) return;
    cascadeControllerRef.current = new CascadeController(params.innerLoop, params.outerLoop);
  };

  const switchToBluetoothSync = async () => {
    if (!isAuthenticated || !connectionManagerRef.current) return false;

    const success = await connectionManagerRef.current.connectBluetooth();
    if (success) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      initializeSync();
    }
    return success;
  };

  const initializeSync = () => {
    if (!isAuthenticated || !connectionManagerRef.current?.isValidConnection()) {
      console.log('Not authenticated or invalid connection type for sync');
      setSyncEnabled(false);
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to music sync server');
        reconnectAttemptRef.current = 0;

        ws.send(JSON.stringify({
          type: 'auth',
          address,
          connectionType: connectionManagerRef.current?.getConnectionType()
        }));
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectedNodes([]);
        handleReconnect();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setSyncEnabled(false);
    }
  };

  const handleReconnect = () => {
    if (!syncEnabled || reconnectTimeoutRef.current || reconnectAttemptRef.current >= maxReconnectAttempts) {
      if (reconnectAttemptRef.current >= maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
        setSyncEnabled(false);
      }
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
    console.log(`Attempting reconnect in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = undefined;
      reconnectAttemptRef.current++;
      if (syncEnabled) {
        initializeSync();
      }
    }, delay);
  };

  const toggleSync = () => {
    if (!isAuthenticated) return;

    setSyncEnabled(!syncEnabled);
    if (!syncEnabled) {
      if (cascadeControllerRef.current) {
        cascadeControllerRef.current.reset();
      }
      if (audioBufferControllerRef.current) {
        audioBufferControllerRef.current.reset();
      }
      setCascadeMetrics(DEFAULT_CASCADE_METRICS);
    }
  };

  const updateMetadata = async (songId: number, metadata: { title: string; artist: string }) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to sync server');
    }

    wsRef.current.send(JSON.stringify({
      type: 'update_metadata',
      songId,
      metadata
    }));
  };

  // Initialize WebSocket connection when sync is enabled
  useEffect(() => {
    if (!syncEnabled || !isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    initializeSync();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    };
  }, [syncEnabled, isAuthenticated, address, currentSong?.id, isPlaying]);

  const contextValue: MusicSyncContextType = {
    syncEnabled,
    toggleSync,
    updateMetadata,
    cascadeMetrics,
    audioMetrics,
    connectedNodes,
    updateControlParameters,
    connectionType: connectionManagerRef.current?.getConnectionType() ?? 'unknown',
    switchToBluetoothSync
  };

  return (
    <MusicSyncContext.Provider value={contextValue}>
      {children}
    </MusicSyncContext.Provider>
  );
}

export function useMusicSync() {
  const context = useContext(MusicSyncContext);
  if (!context) {
    throw new Error('useMusicSync must be used within a MusicSyncProvider');
  }
  return context;
}