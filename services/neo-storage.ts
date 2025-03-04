import { WebSocket } from 'ws';
import { getClients } from './stats';

interface NeoStorageConfig {
  gasRecipient: string;
  defaultGasLimit: string;
}

export interface SongMetadata {
  title: string;
  artist: string;
  uploadedBy: string;
  ipfsHash: string;
  neoContainerId?: string;
  createdAt: Date;
}

// Configuration for NEO FS interactions
const config: NeoStorageConfig = {
  gasRecipient: process.env.GAS_RECIPIENT_ADDRESS || '',
  defaultGasLimit: '1000000',
};

/**
 * Calculates the required GAS for a NEO FS operation
 */
export function calculateRequiredGas(fileSize: number, duration: number): string {
  const baseCost = 0.001; // GAS per MB per hour
  const sizeCost = (fileSize / (1024 * 1024)) * baseCost * duration;
  const overhead = 0.1; // Fixed overhead in GAS
  const totalCost = (sizeCost + overhead) * 1.2;
  return totalCost.toFixed(8);
}

/**
 * Prepares a NEO FS container for song storage
 */
export async function prepareNeoContainer(metadata: SongMetadata): Promise<string> {
  try {
    const containerId = ''; // Would be returned from NEO FS
    return containerId;
  } catch (error) {
    console.error('Error preparing NEO container:', error);
    throw new Error('Failed to prepare NEO container');
  }
}

/**
 * Stores a file in NEO FS
 */
export async function storeInNeoFS(
  fileData: Buffer,
  metadata: SongMetadata
): Promise<{ containerId: string; objectId: string }> {
  try {
    const gas = calculateRequiredGas(fileData.length, 24); // 24 hours storage
    console.log('Calculated gas cost:', gas);

    const containerId = await prepareNeoContainer(metadata);
    const objectId = ''; // Would be returned from NEO FS

    return { containerId, objectId };
  } catch (error) {
    console.error('Error storing in NEO FS:', error);
    throw new Error('Failed to store in NEO FS');
  }
}

/**
 * Broadcasts storage status updates to connected clients
 */
export function broadcastStorageStatus(message: Record<string, unknown>): void {
  try {
    const clients = getClients();
    const broadcastMessage = JSON.stringify({
      type: 'storage_status',
      data: message
    });

    Array.from(clients.entries()).forEach(([client]) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(broadcastMessage);
        } catch (error) {
          console.error('Error broadcasting to client:', error);
        }
      }
    });
  } catch (error) {
    console.error('Error in broadcast:', error);
  }
}

/**
 * Updates song metadata
 */
export async function updateSongMetadata(
  songId: number,
  metadata: Partial<SongMetadata>
): Promise<void> {
  try {
    broadcastStorageStatus({
      type: 'metadata_updated',
      songId,
      metadata
    });
  } catch (error) {
    console.error('Error updating song metadata:', error);
    throw new Error('Failed to update song metadata');
  }
}