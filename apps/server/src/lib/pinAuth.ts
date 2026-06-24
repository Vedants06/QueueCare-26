/**
 * Validates the PIN against the appropriate role's environment variable.
 *
 * Roles:
 *   - 'receptionist' → RECEPTIONIST_PIN
 *   - 'doctor'       → DOCTOR_PIN
 *
 * Backward-compatible: default role is 'receptionist'.
 */
export type Role = 'receptionist' | 'doctor';

export function validatePin(pin: string, role: Role = 'receptionist'): boolean {
  const envVar = role === 'doctor' ? 'DOCTOR_PIN' : 'RECEPTIONIST_PIN';
  const serverPin = process.env[envVar];

  if (!serverPin) {
    console.warn(`[AUTH] ${envVar} not set. All ${role} PINs rejected.`);
    return false;
  }

  return pin === serverPin;
}