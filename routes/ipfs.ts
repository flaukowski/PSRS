import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Infura configuration
const INFURA_PROJECT_ID = process.env.VITE_INFURA_PROJECT_ID;
const INFURA_PROJECT_SECRET = process.env.VITE_INFURA_PROJECT_SECRET;
const INFURA_AUTH = Buffer.from(`${INFURA_PROJECT_ID}:${INFURA_PROJECT_SECRET}`).toString('base64');

// Proxy route for IPFS uploads
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);

    const response = await axios.post('https://ipfs.infura.io:5001/api/v0/add', formData, {
      headers: {
        'Authorization': `Basic ${INFURA_AUTH}`,
        'Content-Type': 'multipart/form-data',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('IPFS upload response:', response.data);
    res.json({ Hash: response.data.Hash });
  } catch (error) {
    console.error('IPFS upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload to IPFS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Proxy route for IPFS downloads
router.get('/fetch/:cid', async (req, res) => {
  try {
    const { cid } = req.params;

    console.log('Fetching from IPFS:', { cid });

    const response = await axios.post(`https://ipfs.infura.io:5001/api/v0/cat`, 
      { arg: cid },
      {
        headers: {
          'Authorization': `Basic ${INFURA_AUTH}`,
        },
        responseType: 'arraybuffer'
      }
    );

    res.set('Content-Type', 'application/octet-stream');
    res.send(response.data);
  } catch (error) {
    console.error('IPFS fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch from IPFS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;