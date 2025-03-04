import { z } from 'zod';
import { Buffer } from 'buffer';
import { createIPFSManager } from './ipfs';

export const DimensionalTrackSchema = z.object({
  id: z.number(),
  ipfsHash: z.string(),
  title: z.string(),
  artist: z.string(),
  dimensionalSignature: z.string().optional(),
  harmonicAlignment: z.number().optional(),
  dimension: z.string().optional(),
  entropyLevel: z.number().optional(),
  quantumState: z.enum(['aligned', 'shifting', 'unstable']).optional(),
});

export type DimensionalTrack = z.infer<typeof DimensionalTrackSchema>;

export const DimensionalPortalSchema = z.object({
  portalId: z.string().optional(),
  tracks: z.array(DimensionalTrackSchema),
  timestamp: z.number(),
  portalSignature: z.string().optional(),
  currentDimension: z.string().optional(),
  entropyState: z.number().optional(),
});

export type DimensionalPortal = z.infer<typeof DimensionalPortalSchema>;

interface NeoFSDetails {
  objectId: string;
  containerId: string;
  bearerToken: string;
  storageGroup: string;
  dataSize: number;
  replicationFactor: number;
}

class DimensionalPortalManager {
  private currentPortal: DimensionalPortal | null = null;
  private audioCache: Map<string, ArrayBuffer> = new Map();
  private loadingPromises: Map<string, Promise<ArrayBuffer>> = new Map();
  private neoFSCache: Map<string, NeoFSDetails> = new Map();
  private ipfsManager = createIPFSManager('default');

  async loadCurrentPortal(): Promise<DimensionalPortal> {
    try {
      const response = await fetch('/api/playlists/current');
      if (!response.ok) {
        throw new Error('Failed to load portal');
      }

      const data = await response.json();
      const portal = DimensionalPortalSchema.parse({
        ...data,
        tracks: data.items.map((item: any) => ({
          id: item.id,
          ipfsHash: item.ipfsHash,
          title: item.title || 'Untitled',
          artist: item.artist || 'Unknown Artist',
          dimensionalSignature: item.dimensionalSignature,
          harmonicAlignment: item.harmonicAlignment,
          dimension: item.dimension,
        }))
      });

      this.currentPortal = portal;
      return portal;
    } catch (error) {
      console.error('Error loading portal:', error);
      throw error;
    }
  }

  async getNeoFSDetails(): Promise<NeoFSDetails> {
    const portalId = this.currentPortal?.portalId;
    if (!portalId) {
      throw new Error('Portal not initialized');
    }

    if (this.neoFSCache.has(portalId)) {
      return this.neoFSCache.get(portalId)!;
    }

    try {
      const response = await fetch(`/api/neo-storage/details/${portalId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch NeoFS details');
      }

      const details: NeoFSDetails = await response.json();
      this.neoFSCache.set(portalId, details);
      return details;
    } catch (error) {
      console.error('Error fetching NeoFS details:', error);
      throw error;
    }
  }

  async preloadAudio(ipfsHash: string): Promise<ArrayBuffer> {
    if (this.audioCache.has(ipfsHash)) {
      return this.audioCache.get(ipfsHash)!;
    }

    if (this.loadingPromises.has(ipfsHash)) {
      return this.loadingPromises.get(ipfsHash)!;
    }

    const loadPromise = (async () => {
      try {
        const buffer = await this.ipfsManager.getFile(ipfsHash);
        this.audioCache.set(ipfsHash, buffer);
        this.loadingPromises.delete(ipfsHash);
        return buffer;
      } catch (error) {
        this.loadingPromises.delete(ipfsHash);
        throw error;
      }
    })();

    this.loadingPromises.set(ipfsHash, loadPromise);
    return loadPromise;
  }

  async generateZKProof(params: {
    signature?: string;
    dimension?: string;
    harmonicAlignment?: number;
    timestamp?: number;
    address?: string;
  }): Promise<string> {
    const proofData = {
      ...params,
      timestamp: params.timestamp || Date.now(),
      entropy: Math.random(),
      portalId: this.currentPortal?.portalId
    };

    return Buffer.from(JSON.stringify(proofData)).toString('base64');
  }

  async submitPlaybackProof(proof: string): Promise<void> {
    await fetch('/api/dimensional/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof })
    });
  }

  clearCache(): void {
    this.audioCache.clear();
    this.loadingPromises.clear();
    this.neoFSCache.clear();
  }
}

export const playlistManager = new DimensionalPortalManager();