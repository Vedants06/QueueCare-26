import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  VerifyPinPayload,
} from '../types';
import { validatePayload, verifyPinSchema } from '../lib/validation';
import { validatePin } from '../lib/pinAuth';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export async function handleVerifyPin(
  _io: TypedServer,
  socket: TypedSocket,
  payload: VerifyPinPayload
): Promise<void> {
  const validation = validatePayload(verifyPinSchema, payload);
  if (!validation.success) {
    socket.emit('verify-pin-result', { valid: false, role: payload.role });
    return;
  }

  const { pin, role } = validation.data;
  const valid = validatePin(pin, role);

  socket.emit('verify-pin-result', { valid, role });
}