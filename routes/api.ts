import { Router } from 'express';
import { db } from '@db';

const router = Router();

// Health check endpoint
router.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Version endpoint
router.get("/version", (_req, res) => {
  res.json({ 
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development'
  });
});

// Example protected endpoint
router.post("/authenticate", async (req, res) => {
  const userAddress = req.headers['x-wallet-address'] as string;

  if (!userAddress) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    res.json({ 
      authenticated: true,
      address: userAddress.toLowerCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
