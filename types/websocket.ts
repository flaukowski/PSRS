export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ClientInfo {
  address?: string;
  currentSong?: number;
  isPlaying?: boolean;
  coordinates?: Coordinates;
  countryCode?: string;
  connectedAt: number;
  isLeader?: boolean;
  currentTime?: number;
  lastSyncTime?: number;
  connectionQuality?: number;
}

export type WebSocketMessage = 
  | { type: 'auth'; address: string }
  | { type: 'subscribe'; songId: number }
  | { type: 'sync'; songId: number; timestamp: number; playing: boolean }
  | { type: 'request_sync'; songId: number }
  | { type: 'location_update'; coordinates: Coordinates; countryCode: string }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'stats_update'; data: LiveStats }
  | { type: 'sync'; songId: number; timestamp: number; playing: boolean }
  | { type: 'leader_update'; isLeader: boolean }
  | { type: 'pong' };

export interface LiveStats {
  activeListeners: number;
  geotaggedListeners: number;
  anonymousListeners: number;
  listenersByCountry: Record<string, number>;
}