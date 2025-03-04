import { apiRequest } from "./queryClient";

export interface NeoFSFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url: string;
}

export interface SongMetadata {
  title: string;
  artist: string;
  uploadedBy: string;
  ipfsHash: string;
  neoContainerId?: string;
  createdAt: Date;
}

// Add GAS calculation function
export async function calculateNeoGas(fileSize: number): Promise<{ requiredGas: string }> {
  const response = await fetch('/api/neo-storage/calculate-gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileSize, duration: 24 }) // 24 hours storage
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to calculate GAS requirement');
  }

  return response.json();
}

// Add NEO wallet payment function
export async function handleGasPayment(amount: string): Promise<string> {
  // NEO wallet interaction code
  const neoDapi = (window as any).NEOLineN3;

  if (!neoDapi) {
    throw new Error('NEO wallet not found. Please install NeoLine or other compatible NEO wallet.');
  }

  try {
    // Request wallet connection
    await neoDapi.getAccount();

    // Convert GAS amount to proper format (multiply by 10^8 as NEO uses 8 decimal places)
    const gasAmount = BigInt(Math.floor(parseFloat(amount) * 100000000));

    // Construct the transaction
    const txParams = {
      fromAddress: await neoDapi.getAccount(),
      toAddress: process.env.VITE_GAS_RECIPIENT_ADDRESS,
      asset: 'GAS',
      amount: gasAmount.toString(),
      remark: 'NEO FS Storage Payment',
      fee: '0'
    };

    // Request payment
    const { txid } = await neoDapi.send(txParams);
    if (!txid) {
      throw new Error('Transaction failed - no transaction ID returned');
    }

    // Wait for transaction confirmation
    let confirmed = false;
    let attempts = 0;
    while (!confirmed && attempts < 30) {
      try {
        const tx = await neoDapi.getTransaction(txid);
        if (tx && tx.blocktime) {
          confirmed = true;
          break;
        }
      } catch (error) {
        console.warn('Waiting for transaction confirmation...', error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!confirmed) {
      throw new Error('Transaction confirmation timeout. Please check your wallet for the status.');
    }

    return txid;
  } catch (error: any) {
    console.error('GAS payment error:', error);
    if (error.type === 'CANCELED') {
      throw new Error('Payment was cancelled by user');
    }
    throw new Error(error.message || 'Failed to process GAS payment');
  }
}

export async function uploadToNeoFS(file: File, address: string): Promise<NeoFSFile> {
  // Validate file size before upload
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const fileSizeMB = file.size / (1024 * 1024);

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than 10MB. Your file is ${fileSizeMB.toFixed(2)}MB`);
  }

  // Validate file type
  const validMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a'
  ];

  if (!validMimeTypes.includes(file.type)) {
    throw new Error('Please select a supported audio file (MP3, WAV, OGG, AAC, M4A).');
  }

  // Calculate required GAS
  const { requiredGas } = await calculateNeoGas(file.size);

  // Process GAS payment
  const gasTransactionHash = await handleGasPayment(requiredGas);

  // Create FormData and append file
  const formData = new FormData();
  formData.append('file', file, file.name);

  console.log('Uploading file to Neo FS:', {
    name: file.name,
    size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
    type: file.type,
    address: address,
    gasTransaction: gasTransactionHash
  });

  // Add GAS transaction hash to headers
  const headers = new Headers();
  headers.append('X-Wallet-Address', address);
  headers.append('X-Gas-Transaction', gasTransactionHash);

  // Calculate timeout based on file size
  const BASE_TIMEOUT = 30000; // 30 seconds base timeout
  const TIMEOUT_PER_MB = 2000; // 2 seconds per MB
  const timeoutDuration = BASE_TIMEOUT + (fileSizeMB * TIMEOUT_PER_MB);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`Upload timed out after ${timeoutDuration/1000}s`);
    controller.abort();
  }, timeoutDuration);

  const MAX_RETRIES = 3;
  let attempt = 0;
  let lastError = null;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`Upload attempt ${attempt + 1} of ${MAX_RETRIES}`);
      const response = await fetch('/api/neo-storage/upload', {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Upload error:', error);

        if (response.status === 502) {
          throw new Error("Neo FS service is currently unavailable. Please try again later.");
        }

        // If we get a 5xx error, we'll retry
        if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }

        throw new Error(error || "Failed to upload file to Neo FS");
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      console.error(`Upload attempt ${attempt + 1} failed:`, error);
      lastError = error;

      if (error.name === 'AbortError') {
        clearTimeout(timeoutId);
        throw new Error(`Upload timed out after ${timeoutDuration/1000} seconds. Please try again with a smaller file or check your connection.`);
      }

      // Network error or other fetch error
      if (error instanceof TypeError && attempt < MAX_RETRIES - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      clearTimeout(timeoutId);
      throw error;
    }
  }

  clearTimeout(timeoutId);
  throw lastError || new Error("Failed to upload file after multiple attempts");
}

export async function listNeoFSFiles(address: string): Promise<NeoFSFile[]> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`List files attempt ${attempt + 1} of ${MAX_RETRIES}`);
      const response = await apiRequest("GET", `/api/neo-storage/files/${address}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Neo FS files");
      }
      const result = await response.json();
      console.log('Files retrieved successfully:', result.length);
      return result;
    } catch (error) {
      console.error(`List files attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to list files after multiple attempts");
}

export async function downloadNeoFSFile(fileId: string, address: string): Promise<Blob> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`Download attempt ${attempt + 1} of ${MAX_RETRIES}`);
      const response = await apiRequest("GET", `/api/neo-storage/download/${address}/${fileId}`);
      if (!response.ok) {
        throw new Error("Failed to download file from Neo FS");
      }
      const blob = await response.blob();
      console.log('Download successful, blob size:', blob.size);
      return blob;
    } catch (error) {
      console.error(`Download attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to download file after multiple attempts");
}