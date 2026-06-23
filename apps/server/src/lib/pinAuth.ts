/**
 * Validates the receptionist PIN against the server environment variable.
 *
 * PIN is a 4-digit string stored only in process.env.RECEPTIONIST_PIN.
 * Never stored in DB. Never broadcast to clients.
 *
 * Upgrade path for production:
 *   Replace with JWT + clinic-specific accounts.
 *   One account per receptionist with admin role for clinic owner.
 */
export function validatePin(pin: string): boolean {
  const serverPin = process.env.RECEPTIONIST_PIN;

  if (!serverPin) {
    console.warn('[AUTH] RECEPTIONIST_PIN not set in environment. All PINs rejected.');
    return false;
  }

  return pin === serverPin;
}