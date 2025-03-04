import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios, { AxiosRequestConfig } from 'axios';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { WebSocket } from 'ws';

// Define custom request type with multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: { [fieldname: string]: Express.Multer.File[] };
}

const router = Router();

// Configure multer with proper field name and file type validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file type
    const validMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a'
    ];
    if (!validMimeTypes.includes(file.mimetype)) {
      cb(new Error('Please select a supported audio file (MP3, WAV, OGG, AAC, M4A).'));
      return;
    }
    cb(null, true);
  }
});

// Add GAS calculation endpoint
router.post('/calculate-gas', async (req, res) => {
  try {
    const { fileSize, duration } = req.body;

    if (!fileSize || !duration) {
      return res.status(400).json({
        error: 'Missing required parameters. Please provide fileSize and duration.'
      });
    }

    // Call NEO node RPC to get current GAS price
    const neoNodeUrl = process.env.NEO_NODE_URL || 'https://mainnet1.neo.coz.io:443';
    const response = await axios.post(neoNodeUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getgasprice',
      params: []
    });

    if (!response.data?.result?.fast) {
      throw new Error('Failed to fetch GAS price from NEO node');
    }

    // Calculate required GAS based on file size and duration
    const baseCost = 0.001; // GAS per MB per hour
    const sizeCost = (fileSize / (1024 * 1024)) * baseCost * duration;
    const overhead = 0.1;
    const gasPriceMultiplier = parseInt(response.data.result.fast) / 1000;
    const totalCost = (sizeCost + overhead) * 1.2 * gasPriceMultiplier;

    res.json({
      requiredGas: totalCost.toFixed(8),
      gasPriceMultiplier,
      breakdown: {
        sizeCost: sizeCost.toFixed(8),
        overhead: overhead.toFixed(8),
        buffer: (totalCost - sizeCost - overhead).toFixed(8)
      }
    });
  } catch (error) {
    console.error('Error calculating GAS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({
      error: 'Failed to calculate GAS requirement',
      details: errorMessage
    });
  }
});

// Updated API endpoint to include version and proper path
const NEO_FS_API = "https://fs.neo.org/api/v1";

// Custom axios config type with retry
interface CustomAxiosConfig extends AxiosRequestConfig {
  retry?: number;
  retryDelay?: (retryCount: number) => number;
}

// Upload file to Neo FS
router.post('/upload', upload.single('file'), async (req: MulterRequest, res) => {
  try {
    if (!req.file) {
      console.error('No file in request:', req.files, req.file);
      return res.status(400).json({ error: 'No file provided' });
    }

    // Get wallet address and transaction hash from headers
    const address = req.headers['x-wallet-address'] as string;
    const gasTransactionHash = req.headers['x-gas-transaction'] as string;

    if (!address || !gasTransactionHash) {
      console.error('Missing required headers:', {
        address: !!address,
        gasTransaction: !!gasTransactionHash
      });
      return res.status(400).json({
        error: 'Missing required headers. Please provide wallet address and GAS transaction hash.'
      });
    }

    // Verify GAS payment transaction
    const neoNodeUrl = process.env.NEO_NODE_URL || 'https://mainnet1.neo.coz.io:443';
    const txResponse = await axios.post(neoNodeUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'gettransaction',
      params: [gasTransactionHash]
    });

    if (!txResponse.data?.result?.blocktime) {
      throw new Error('Invalid or pending GAS transaction');
    }

    const fileSizeMB = req.file.size / (1024 * 1024);
    console.log('Received file upload request:', {
      filename: req.file.originalname,
      size: `${fileSizeMB.toFixed(2)}MB`,
      mimetype: req.file.mimetype,
      address: address,
      gasTransaction: gasTransactionHash
    });

    // Create form data for Neo FS
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);
    formData.append('wallet', address);
    formData.append('type', 'audio');

    // Calculate timeout based on file size
    const BASE_TIMEOUT = 30000;
    const TIMEOUT_PER_MB = 2000;
    const timeoutDuration = BASE_TIMEOUT + (fileSizeMB * TIMEOUT_PER_MB);

    // Upload to Neo FS with dynamic timeout and retries
    const config: CustomAxiosConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
      timeout: timeoutDuration,
      maxContentLength: 10 * 1024 * 1024,
      maxBodyLength: 10 * 1024 * 1024,
      validateStatus: null,
      retry: 3,
      retryDelay: (retryCount: number) => retryCount * 1000
    };

    const response = await axios.post(`${NEO_FS_API}/objects`, formData, config);

    console.log('Neo FS response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });

    if (!response.data || response.status !== 200) {
      console.error('Neo FS error response:', response.data);
      throw new Error(response.data?.error || response.data?.message || 'Failed to upload to Neo FS');
    }

    const fileData = {
      id: response.data.id,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      url: `${NEO_FS_API}/objects/${response.data.id}`,
    };

    console.log('Upload successful:', fileData);
    res.json(fileData);
  } catch (error: any) {
    console.error('Neo FS upload error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Upload timed out. Please try again with a smaller file.' });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Unable to connect to Neo FS. Please try again later.' });
    }

    if (error.response?.status === 502) {
      return res.status(502).json({ error: 'Neo FS service is currently unavailable. Please try again later.' });
    }

    if (error.response?.status === 413 || error instanceof multer.MulterError) {
      return res.status(413).json({ error: 'File is too large. Maximum size is 10MB.' });
    }

    res.status(500).json({ error: 'Failed to upload file to Neo FS', details: error.message });
  }
});

// Update list files endpoint with better error handling
router.get('/files/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log('Fetching files for wallet:', address);

    const config: CustomAxiosConfig = {
      params: { wallet: address },
      timeout: 10000,
      validateStatus: null,
      headers: {
        'Accept': 'application/json'
      },
      retry: 3,
      retryDelay: (retryCount: number) => retryCount * 1000
    };

    const response = await axios.get(`${NEO_FS_API}/objects`, config);

    console.log('Neo FS list response:', {
      status: response.status,
      statusText: response.statusText,
      dataLength: Array.isArray(response.data) ? response.data.length : 'not an array',
      error: response.data?.error || response.data?.message
    });

    // If no files exist, return empty array instead of error
    if (response.status === 404) {
      console.log('No files found for wallet:', address);
      return res.json([]);
    }

    if (!response.data || response.status !== 200) {
      console.error('Neo FS list error:', response.data);
      throw new Error(response.data?.error || response.data?.message || 'Failed to list files from Neo FS');
    }

    // Ensure we always return an array
    const files = Array.isArray(response.data) ? response.data : [];
    res.json(files);
  } catch (error: any) {
    console.error('Neo FS list error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });

    // Handle common errors gracefully
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Request timed out. Please try again.' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Unable to connect to Neo FS. Please try again later.' });
    }

    // For no files case, return empty array
    if (error.response?.status === 404) {
      return res.json([]);
    }

    res.status(500).json({ error: 'Failed to list Neo FS files', details: error.message });
  }
});

// Update the download endpoint with proper types
router.get('/download/:address/:fileId', async (req, res) => {
  try {
    const { address, fileId } = req.params;
    console.log('Downloading file:', { address, fileId });

    const config: CustomAxiosConfig = {
      responseType: 'stream',
      params: { wallet: address },
      timeout: 15000,
      validateStatus: null,
      headers: {
        'Accept': '*/*'
      },
      retry: 3,
      retryDelay: (retryCount: number) => retryCount * 1000
    };

    const response = await axios.get(`${NEO_FS_API}/objects/${fileId}`, config);

    if (!response.data || response.status !== 200) {
      console.error('Neo FS download error:', response.data);
      throw new Error(response.data?.error || response.data?.message || 'Failed to download from Neo FS');
    }

    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', response.headers['content-disposition']);

    response.data.pipe(res);
  } catch (error: any) {
    console.error('Neo FS download error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Download timed out. Please try again.' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Unable to connect to Neo FS. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to download file from Neo FS', details: error.message });
  }
});

// Add error handling middleware
router.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('NEO Storage error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload error',
      details: err.message
    });
  }
  if (err.message.includes('Neo FS')) {
    return res.status(503).json({
      error: 'Neo FS service temporarily unavailable',
      details: err.message
    });
  }
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

export default router;