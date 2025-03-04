import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer } from 'ws';
import musicRouter from './routes/music';
import playlistRouter from './routes/playlists';
import userRouter from './routes/users';
import adminRouter from './routes/admin';
import neoStorageRouter from './routes/neo-storage';
import translationRouter from './routes/translation';
import lumiraRouter from './routes/lumira';
import radioRouter from './routes/radio';
import apiRouter from './routes/api'; // Add new API router import

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Initialize WebSocket server with a distinct path
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws'
  });

  // Handle upgrade manually to prevent conflicts with Vite HMR
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws);
      });
    }
  });

  // Add API routes
  app.use('/api/music', musicRouter);
  app.use('/api/playlists', playlistRouter);
  app.use('/api/users', userRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/translate', translationRouter);
  app.use('/api/lumira', lumiraRouter);
  app.use('/api/neo-storage', neoStorageRouter);
  app.use('/api/radio', radioRouter);
  app.use('/api/v1', apiRouter); // Register new API router

  return httpServer;
}