import dotenv from 'dotenv';
dotenv.config();

console.log('[BOOT] dotenv loaded');
console.log('[BOOT] PORT =', process.env.PORT);
console.log('[BOOT] FRONTEND_URL =', process.env.FRONTEND_URL);
console.log('[BOOT] PIN set =', !!process.env.RECEPTIONIST_PIN);

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from './types';

console.log('[BOOT] Express imported');

import { connectDatabase, disconnectDatabase } from './db/prisma';

console.log('[BOOT] Prisma imported');

import { restoreSession } from './startup/restoreSession';
import { registerSocketHandlers } from './socket';
import { stopAllTimers } from './lib/consultationTimer';
import { healthRouter } from './routes/health';
import { historyRouter } from './routes/history';
import { sessionRouter } from './routes/session';
import { analyticsRouter } from './routes/analytics';
import { historyExportRouter } from './routes/historyExport';


console.log('[BOOT] All imports complete');

const PORT = parseInt(process.env.PORT || '4000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function main(): Promise<void> {
  console.log('[BOOT] main() started');

  const app = express();

  app.use(
    cors({
      origin: FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    })
  );

  app.use(express.json());

  app.use(healthRouter);
  app.use(historyRouter);
  app.use(historyExportRouter);
  app.use(sessionRouter);
  app.use(analyticsRouter);

  console.log('[BOOT] Routes registered');

  const httpServer = http.createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: 25000,
      pingTimeout: 20000,
    }
  );

  console.log('[BOOT] Socket.IO attached');

  try {
    await connectDatabase();
  } catch (error) {
    console.warn('[STARTUP] Database connection failed:', error);
  }

  console.log('[BOOT] DB step complete');

  try {
    await restoreSession(io);
  } catch (error) {
    console.warn('[STARTUP] Session restoration failed:', error);
  }

  console.log('[BOOT] Session restore complete');

  registerSocketHandlers(io);

  console.log('[BOOT] Socket handlers registered');

  httpServer.listen(PORT, () => {
    console.log('');
    console.log('══════════════════════════════════════════');
    console.log('  QueueCure Server');
    console.log(`  Port:     ${PORT}`);
    console.log(`  CORS:     ${FRONTEND_URL}`);
    console.log(`  PIN set:  ${process.env.RECEPTIONIST_PIN ? 'Yes' : 'NO'}`);
    console.log('══════════════════════════════════════════');
    console.log('');
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[SHUTDOWN] ${signal} received`);
    stopAllTimers();
    io.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[ERROR] Unhandled rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('[ERROR] Uncaught exception:', error);
    shutdown('uncaughtException').catch(() => process.exit(1));
  });
}

main().catch((error) => {
  console.error('[FATAL] main() failed:', error);
  process.exit(1);
});