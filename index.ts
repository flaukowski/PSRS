import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { IncomingMessage } from 'http';
import { createServer } from 'http';
import musicRouter from './routes/music';
import playlistRouter from './routes/playlists';
import userRouter from './routes/users';
import adminRouter from './routes/admin';
import neoStorageRouter from './routes/neo-storage';
import translationRouter from './routes/translation';
import lumiraRouter from './routes/lumira';
import ipfsRouter from './routes/ipfs';
import apiRouter from './routes/api';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom WebSocket type with isAlive property
interface CustomWebSocket extends WebSocket {
  isAlive: boolean;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Register API routes before Vite middleware
app.use('/api/v1', apiRouter);
app.use('/api/music', musicRouter);
app.use('/api/playlists', playlistRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/translate', translationRouter);
app.use('/api/lumira', lumiraRouter);
app.use('/api/neo-storage', neoStorageRouter);
app.use('/api/ipfs', ipfsRouter);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error('Server error:', err);
  res.status(status).json({ message });
});

const startServer = async (retryCount = 0) => {
  const maxRetries = 3;
  const basePort = 5000;
  const port = basePort + (retryCount * 100);

  try {
    const server = createServer(app);

    // Initialize WebSocket server with a distinct path
    const wss = new WebSocketServer({ 
      noServer: true,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });

    // Keep track of handled sockets to prevent duplicate upgrades
    const handledSockets = new WeakSet();

    // Handle upgrade manually to prevent conflicts with Vite HMR
    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      // Skip if this socket was already handled
      if (handledSockets.has(socket)) {
        return;
      }

      try {
        const pathname = request.url 
          ? new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname
          : '/';
        const protocol = request.headers['sec-websocket-protocol'];

        // Ignore Vite HMR WebSocket connections
        if (protocol === 'vite-hmr') {
          return;
        }

        // Only handle WebSocket connections to /ws path
        if (pathname === '/ws') {
          // Mark this socket as handled
          handledSockets.add(socket);

          wss.handleUpgrade(request, socket, head, (ws) => {
            const customWs = ws as CustomWebSocket;
            customWs.isAlive = true;
            wss.emit('connection', customWs);
          });
        }
      } catch (error) {
        console.error('WebSocket upgrade error:', error);
        socket.destroy();
      }
    });

    // Set up Vite or static file serving after API routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    await new Promise<void>((resolve, reject) => {
      server.listen(port, "0.0.0.0")
        .once('listening', () => {
          log(`Server running on port ${port}`);
          resolve();
        })
        .once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE' && retryCount < maxRetries) {
            server.close();
            startServer(retryCount + 1);
          } else {
            reject(err);
          }
        });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    if (retryCount < maxRetries) {
      console.log(`Retrying on port ${port + 100}...`);
      await startServer(retryCount + 1);
    } else {
      console.error('Max retries reached. Unable to start server.');
      process.exit(1);
    }
  }
};

startServer();