import { z } from 'zod';

// ─── Reusable field schemas ─────────────────────────────────────

const clinicIdField = z.string().min(1, 'clinicId is required');
const pinField = z.string().length(4, 'PIN must be exactly 4 digits');
const tokenField = z.number().int().positive('Token must be a positive integer');

// ─── Client → Server Socket Event Schemas ──────────────────────

export const joinClinicSchema = z.object({
  clinicId: clinicIdField,
});

// Indian mobile number: 10 digits starting with 6, 7, 8, or 9
// Accepts optional +91 or 91 prefix which will be stripped client-side
const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true; // empty is OK (optional)
      return /^[6-9]\d{9}$/.test(val.trim());
    },
    {
      message: 'Phone must be a 10-digit Indian mobile starting with 6, 7, 8, or 9',
    }
  );

export const addPatientSchema = z.object({
  clinicId: clinicIdField,
  name: z.string().min(1, 'Patient name is required').max(100, 'Name too long'),
  phone: phoneSchema,
  priority: z.boolean().optional(),
});

export const callNextSchema = z.object({
  clinicId: clinicIdField,
  receptionistPin: pinField,
});

export const markDoneSchema = z.object({
  clinicId: clinicIdField,
  token: tokenField,
  receptionistPin: pinField,
});

export const markAbsentSchema = z.object({
  clinicId: clinicIdField,
  token: tokenField,
  receptionistPin: pinField,
});

export const reinstateSchema = z.object({
  clinicId: clinicIdField,
  token: tokenField,
  position: z.enum(['front', 'back'], {
    errorMap: () => ({ message: 'Position must be "front" or "back"' }),
  }),
  receptionistPin: pinField,
});

export const skipTokenSchema = z.object({
  clinicId: clinicIdField,
  token: tokenField,
  receptionistPin: pinField,
});

export const undoCallSchema = z.object({
  clinicId: clinicIdField,
  receptionistPin: pinField,
});

export const recallTokenSchema = z.object({
  clinicId: clinicIdField,
  receptionistPin: pinField,
});

export const pauseQueueSchema = z.object({
  clinicId: clinicIdField,
  pause: z.boolean(),
  receptionistPin: pinField,
});

export const resetQueueSchema = z.object({
  clinicId: clinicIdField,
  receptionistPin: pinField,
});

export const setNotesSchema = z.object({
  clinicId: clinicIdField,
  token: tokenField,
  notes: z.string().max(2000, 'Notes too long (max 2000 chars)'),
  doctorPin: pinField,
});

export const setAvgTimeSchema = z.object({
  clinicId: clinicIdField,
  minutes: z
    .number()
    .positive('Average time must be positive')
    .max(120, 'Average time cannot exceed 120 minutes'),
  receptionistPin: pinField,
});

export const verifyPinSchema = z.object({
  clinicId: clinicIdField,
  pin: pinField,
  role: z.enum(['receptionist', 'doctor']),
});

// ─── Validation helper ──────────────────────────────────────────

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validatePayload<T>(
  schema: z.ZodSchema<T>,
  payload: unknown
): ValidationResult<T> {
  const result = schema.safeParse(payload);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Combine all error messages into one string
  const errorMessage = result.error.issues
    .map((issue) => issue.message)
    .join('; ');

  return { success: false, error: errorMessage };
}