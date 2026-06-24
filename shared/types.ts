// shared/types.ts
// ─── Patient Status ─────────────────────────────────────────────
export type PatientStatus =
  | 'waiting'
  | 'serving'
  | 'done'
  | 'skipped'
  | 'absent';

// ─── Patient ────────────────────────────────────────────────────
export interface Patient {
  token: number;
  name: string;
  phone?: string;
  clinicId: string;
  priority: boolean;
  status: PatientStatus;
  addedAt: number;
  calledAt?: number;
  doneAt?: number;
  absentAt?: number;
  reinstatedAt?: number;
  absentCount: number;
  accessToken: string;
  notes?: string;
}

// ─── Queue State ────────────────────────────────────────────────
export interface QueueState {
  clinicId: string;
  currentToken: number | null;
  queue: Patient[];
  absentPatients: Patient[];
  consultHistory: number[];
  avgConsultTime: number;
  isPaused: boolean;
  sessionStartedAt: number;
  lastDate: string;
}

// ─── Wait Estimate ──────────────────────────────────────────────
export interface WaitEstimate {
  low: number;
  high: number;
  dataPoints: number;
  isRealData: boolean;
  confidenceMargin: number;
}

// ─── Analytics ──────────────────────────────────────────────────
export interface AnalyticsData {
  servedToday: number;
  skippedToday: number;
  absentToday: number;
  reinstatedToday: number;
  avgConsultReal: number;
  avgConsultFallback: number;
  dataPoints: number;
  outliersExcluded: number;
  throughputPerHour: number;
}

// ─── PIN Auth State (Frontend Only) ─────────────────────────────
export interface PinAuthState {
  isAuthenticated: boolean;
  pin: string;
  attempts: number;
  cooldownUntil: number | null;
}

// ─── Socket Error Codes ─────────────────────────────────────────
export type SocketErrorCode =
  | 'empty-queue'
  | 'busy'
  | 'unauthorized'
  | 'undo-expired'
  | 'not-found'
  | 'invalid-payload'
  | 'queue-paused'
  | 'already-serving'
  | 'not-in-absent-tray';

export interface QueueError {
  code: SocketErrorCode;
  message: string;
}

// ─── Client → Server Socket Payloads ────────────────────────────

export interface JoinClinicPayload {
  clinicId: string;
}

export interface AddPatientPayload {
  clinicId: string;
  name: string;
  phone?: string;
  priority?: boolean;
}

export interface CallNextPayload {
  clinicId: string;
  receptionistPin: string;
}

export interface MarkDonePayload {
  clinicId: string;
  token: number;
  receptionistPin: string;
}

export interface MarkAbsentPayload {
  clinicId: string;
  token: number;
  receptionistPin: string;
}

export interface ReinstatePayload {
  clinicId: string;
  token: number;
  position: 'front' | 'back';
  receptionistPin: string;
}

export interface SkipTokenPayload {
  clinicId: string;
  token: number;
  receptionistPin: string;
}

export interface UndoCallPayload {
  clinicId: string;
  receptionistPin: string;
}

export interface RecallTokenPayload {
  clinicId: string;
  receptionistPin: string;
}

export interface PauseQueuePayload {
  clinicId: string;
  pause: boolean;
  receptionistPin: string;
}

export interface ResetQueuePayload {
  clinicId: string;
  receptionistPin: string;
}

export interface SetAvgTimePayload {
  clinicId: string;
  minutes: number;
  receptionistPin: string;
}

// ─── Server → Client Event Payloads ────────────────────────────

export interface TokenCalledPayload {
  token: number;
  name: string;
  estimatedWait: WaitEstimate | null;
  isRecall: boolean;
}

export interface PatientAddedPayload {
  patient: Patient;
}

export interface PatientReinstatedPayload {
  token: number;
  name: string;
  position: 'front' | 'back';
}

export interface DuplicateWarningPayload {
  existingToken: number;
  name: string;
  phone: string;
}

export interface MarkDoneSuccessPayload {
  token: number;
  duration: number;
}

export interface RecallSuccessPayload {
  token: number;
  name: string;
}

export interface QueuePausedPayload {
  isPaused: boolean;
}

export interface QueueResetPayload {
  sessionStartedAt: number;
}

export interface ConsultationWarningPayload {
  token: number;
  name: string;
  elapsedMinutes: number;
  avgMinutes: number;
}

export interface PriorityAlertPayload {
  token: number;
  name: string;
}

export interface QueueUpdatePayload {
  state: QueueState;
  analytics: AnalyticsData;
}

// ─── Socket Event Maps (for type-safe Socket.IO) ───────────────

export interface ClientToServerEvents {
  'join-clinic': (payload: JoinClinicPayload) => void;
  'add-patient': (payload: AddPatientPayload) => void;
  'call-next': (payload: CallNextPayload) => void;
  'mark-done': (payload: MarkDonePayload) => void;
  'mark-absent': (payload: MarkAbsentPayload) => void;
  'reinstate': (payload: ReinstatePayload) => void;
  'skip-token': (payload: SkipTokenPayload) => void;
  'undo-call': (payload: UndoCallPayload) => void;
  'recall-token': (payload: RecallTokenPayload) => void;
  'pause-queue': (payload: PauseQueuePayload) => void;
  'reset-queue': (payload: ResetQueuePayload) => void;
  'set-avg-time': (payload: SetAvgTimePayload) => void;
}

export interface ServerToClientEvents {
  'state-sync': (payload: QueueState) => void;
  'queue-update': (payload: QueueUpdatePayload) => void;
  'token-called': (payload: TokenCalledPayload) => void;
  'patient-added': (payload: PatientAddedPayload) => void;
  'patient-reinstated': (payload: PatientReinstatedPayload) => void;
  'duplicate-warning': (payload: DuplicateWarningPayload) => void;
  'mark-done-success': (payload: MarkDoneSuccessPayload) => void;
  'recall-success': (payload: RecallSuccessPayload) => void;
  'queue-paused': (payload: QueuePausedPayload) => void;
  'queue-reset': (payload: QueueResetPayload) => void;
  'consultation-warning': (payload: ConsultationWarningPayload) => void;
  'priority-alert': (payload: PriorityAlertPayload) => void;
  'queue-error': (payload: QueueError) => void;
}