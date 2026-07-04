import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from './types';
import { handleJoinClinic } from './handlers/joinClinic';
import { handleAddPatient } from './handlers/addPatient';
import { handleCallNext } from './handlers/callNext';
import { handleMarkDone } from './handlers/markDone';
import { handleMarkAbsent } from './handlers/markAbsent';
import { handleReinstate } from './handlers/reinstate';
import { handleSkipToken } from './handlers/skipToken';
import { handleUndoCall } from './handlers/undoCall';
import { handleRecallToken } from './handlers/recallToken';
import { handlePauseQueue } from './handlers/pauseQueue';
import { handleResetQueue } from './handlers/resetQueue';
import { handleSetAvgTime } from './handlers/setAvgTime';
import { handleSetNotes } from './handlers/setNotes';
import { handleVerifyPin } from './handlers/verifyPin';
import { handleSeedDemoData } from './handlers/seedDemoData';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Registers all Socket.IO event handlers.
 *
 * Each incoming socket connection:
 *   1. Logs the connection
 *   2. Registers all 12 event listeners
 *   3. Each listener calls its handler function
 *   4. Logs disconnection
 *
 * Socket.IO automatically handles room cleanup on disconnect —
 * no manual room leave needed.
 */
export function registerSocketHandlers(io: TypedServer): void {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected: ${socket.id}`);

    // ─── Read Events ──────────────────────────────────────────

    socket.on('join-clinic', (payload) => {
      handleJoinClinic(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in join-clinic from ${socket.id}:`, err)
      );
    });

    // ─── Patient Management ───────────────────────────────────

    socket.on('add-patient', (payload) => {
      handleAddPatient(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in add-patient from ${socket.id}:`, err)
      );
    });

    socket.on('call-next', (payload) => {
      handleCallNext(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in call-next from ${socket.id}:`, err)
      );
    });

    socket.on('mark-done', (payload) => {
      handleMarkDone(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in mark-done from ${socket.id}:`, err)
      );
    });

    socket.on('mark-absent', (payload) => {
      handleMarkAbsent(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in mark-absent from ${socket.id}:`, err)
      );
    });

    socket.on('reinstate', (payload) => {
      handleReinstate(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in reinstate from ${socket.id}:`, err)
      );
    });

    socket.on('skip-token', (payload) => {
      handleSkipToken(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in skip-token from ${socket.id}:`, err)
      );
    });

    socket.on('set-notes', (payload) => {
      handleSetNotes(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in set-notes from ${socket.id}:`, err)
      );
    });

    socket.on('verify-pin', (payload) => {
      handleVerifyPin(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in verify-pin from ${socket.id}:`, err)
      );
    });

    socket.on('seed-demo-data', (payload) => {
      handleSeedDemoData(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in seed-demo-data from ${socket.id}:`, err)
      );
    });

    // ─── Queue Control ────────────────────────────────────────

    socket.on('undo-call', (payload) => {
      handleUndoCall(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in undo-call from ${socket.id}:`, err)
      );
    });

    socket.on('recall-token', (payload) => {
      handleRecallToken(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in recall-token from ${socket.id}:`, err)
      );
    });

    socket.on('pause-queue', (payload) => {
      handlePauseQueue(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in pause-queue from ${socket.id}:`, err)
      );
    });

    socket.on('reset-queue', (payload) => {
      handleResetQueue(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in reset-queue from ${socket.id}:`, err)
      );
    });

    socket.on('set-avg-time', (payload) => {
      handleSetAvgTime(io, socket, payload).catch((err) =>
        console.error(`[SOCKET] Error in set-avg-time from ${socket.id}:`, err)
      );
    });

    // ─── Disconnect ───────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Disconnected: ${socket.id} (reason: ${reason})`);
    });
  });
}