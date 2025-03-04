import { Buffer } from 'buffer';
import { apiRequest } from './queryClient';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

interface StorageMetadata {
  title: string;
  artist: string;
  fileSize: number;
  duration?: number;
  mimeType: string;
  uploadedBy: string;
}

export async function uploadFile(file: File, metadata: StorageMetadata) {
  try {
    console.log('Starting file upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await apiRequest('POST', '/api/ipfs/upload', {
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      type: 'ipfs' as const,
      hash: response.Hash,
      metadata
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function getFileBuffer(source: { type: 'ipfs', hash: string }): Promise<ArrayBuffer> {
  try {
    if (!source.hash) {
      throw new Error('Missing IPFS hash');
    }

    // Use fetch directly for binary data
    const response = await fetch(`/api/ipfs/fetch/${source.hash}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('File retrieval error:', error);
    throw error;
  }
}

// Helper to check file availability
export async function checkFileAvailability(source: { type: 'ipfs', hash: string }): Promise<boolean> {
  try {
    if (!source.hash) {
      return false;
    }

    const response = await fetch(`/api/ipfs/fetch/${source.hash}`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
}