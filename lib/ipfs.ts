import { Buffer } from 'buffer';
import axios from 'axios';

export class IPFSManager {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private walletAddress: string;

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  async getFile(cid: string): Promise<ArrayBuffer> {
    try {
      console.log('Fetching from IPFS:', { cid });

      // Use the server-side proxy instead of direct Infura access
      const response = await this.retry(async () => {
        const fetchResponse = await axios.get(`/api/ipfs/fetch/${cid}`, {
          headers: {
            'X-Wallet-Address': this.walletAddress,
          },
          responseType: 'arraybuffer'
        });

        if (!fetchResponse.data) {
          throw new Error('No data received from IPFS');
        }

        return fetchResponse.data;
      });

      return response;
    } catch (error) {
      console.error('IPFS fetch error:', error);
      throw error instanceof Error ? error : new Error('Unknown fetch error');
    }
  }

  async uploadFile(file: File): Promise<string> {
    try {
      console.log('Starting IPFS upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString()
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet', this.walletAddress);

      const response = await this.retry(async () => {
        const uploadResponse = await axios.post('/api/ipfs/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Wallet-Address': this.walletAddress,
          }
        });

        if (!uploadResponse.data?.Hash) {
          throw new Error('Invalid IPFS upload response');
        }

        return uploadResponse.data;
      });

      console.log('IPFS upload successful:', response);
      return response.Hash;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error instanceof Error ? error : new Error('Unknown upload error');
    }
  }
}

export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}