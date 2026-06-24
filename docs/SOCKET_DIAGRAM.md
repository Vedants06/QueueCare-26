# QueueCure — Socket Event Reference

Complete documentation of every WebSocket event flowing between clients and the server.

## Table of Contents

- [Architecture](#architecture)
- [Client → Server Events](#client--server-events)
- [Server → Client Events](#server--client-events)
- [Error Codes](#error-codes)
- [Key Sequence Flows](#key-sequence-flows)
- [Data Structures](#data-structures)
- [In-Memory Store Keys](#in-memory-store-keys)
- [REST Endpoints](#rest-endpoints)

---

## Architecture

```
┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│   Receptionist   │  │      Doctor      │  │    Display TV   │  │   Patient mobile │
│   /receptionist  │  │      /doctor     │  │     /display    │  │     /patient     │
│    PIN gated     │  │    PIN gated     │  │     no auth      │  │   access token    │
└────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
         │                     │                      │                     │
         │     Socket.IO       │      Socket.IO        │      Socket.IO       │
         └──────────┬──────────┴──────────┬───────────┴───────────┬─────────┘
                    │                     │                       │
                    └─────────────────────┴───────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────────────────┐
                  │            Express + Socket.IO Server (Render)           │
                  │                                                          │
                  │   ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
                  │   │  queueStore  │  │ async-mutex  │  │ Zod validation│  │
                  │   │ (in-memory)  │  │ (per clinic) │  │  (all events) │  │
                  │   └──────┬───────┘  └──────────────┘  └───────────────┘  │
                  │          │                                              │
                  │   ┌──────▼───────┐                                      │
                  │   │  Prisma ORM  │                                      │
                  │   └──────┬───────┘                                      │
                  └──────────┼──────────────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   PostgreSQL (Neon)  │
                  │                      │
                  │   PatientHistory     │
                  │   ConsultHistory     │
                  │   ClinicSession      │
                  └──────────────────────┘
```

All clients join a Socket.IO room named by their `clinicId`. The server broadcasts state changes to the entire room. State lives in memory for sub-millisecond access; completed patients persist to PostgreSQL.

---

## Client → Server Events

### Connection & auth

| Event | Payload | Auth | Description |
|---|---|---|---|
| `join-clinic` | `{ clinicId }` | None | Joins the room, receives `state-sync` |
| `verify-pin` | `{ clinicId, pin, role }` | None | Tests a PIN against the server's env var |

### Patient management

| Event | Payload | Auth | Description |
|---|---|---|---|
| `add-patient` | `{ clinicId, name, phone?, priority? }` | None | Adds a patient, generates an access token |
| `call-next` | `{ clinicId, receptionistPin }` | PIN | Advances the queue, snapshots for undo |
| `mark-done` | `{ clinicId, token, receptionistPin }` | PIN | Records duration, writes to the database |
| `mark-absent` | `{ clinicId, token, receptionistPin }` | PIN | Moves the patient to the absent tray |
| `reinstate` | `{ clinicId, token, position, receptionistPin }` | PIN | Returns an absent patient to the queue |
| `skip-token` | `{ clinicId, token, receptionistPin }` | PIN | Permanent skip — main queue or absent tray |
| `set-notes` | `{ clinicId, token, notes, doctorPin }` | Doctor PIN | Saves the doctor's consultation notes |

### Queue control

| Event | Payload | Auth | Description |
|---|---|---|---|
| `undo-call` | `{ clinicId, receptionistPin }` | PIN | Restores the snapshot within the 5s window |
| `recall-token` | `{ clinicId, receptionistPin }` | PIN | Re-announces the current token |
| `pause-queue` | `{ clinicId, pause, receptionistPin }` | PIN | Toggles the queue's pause state |
| `reset-queue` | `{ clinicId, receptionistPin }` | PIN | Clears the queue, starts a new session |
| `set-avg-time` | `{ clinicId, minutes, receptionistPin }` | PIN | Updates the fallback consultation time |

> **Note:** `role` on `verify-pin` is either `'receptionist'` or `'doctor'` — the server checks it against the matching env variable. The `receptionistPin` field on PIN-gated events accepts either PIN; the server validates against both roles.

---

## Server → Client Events

| Event | Target | Payload | Trigger |
|---|---|---|---|
| `state-sync` | Joining socket only | Full `QueueState` | `join-clinic`, reconnect |
| `queue-update` | Clinic room | `{ state, analytics }` | Every mutation |
| `token-called` | Clinic room | `{ token, name, estimatedWait, isRecall }` | `call-next`, `recall-token` |
| `patient-added` | Sender only | `{ patient }` | `add-patient` success — opens QR modal |
| `patient-reinstated` | Clinic room | `{ token, name, position }` | `reinstate` success |
| `duplicate-warning` | Sender only | `{ existingToken, name, phone }` | Same phone within 30s |
| `mark-done-success` | Sender only | `{ token, duration }` | `mark-done` success |
| `recall-success` | Sender only | `{ token, name }` | `recall-token` success |
| `queue-paused` | Clinic room | `{ isPaused }` | `pause-queue` |
| `queue-reset` | Clinic room | `{ sessionStartedAt }` | `reset-queue` |
| `consultation-warning` | Clinic room | `{ token, name, elapsedMinutes, avgMinutes }` | Server timer, 2× average exceeded |
| `priority-alert` | Sender only | `{ token, name }` | Priority patient added during pause |
| `queue-error` | Sender only | `{ code, message }` | Any failure |
| `verify-pin-result` | Sender only | `{ valid, role }` | `verify-pin` response |

---

## Error Codes

| Code | Meaning |
|---|---|
| `empty-queue` | `call-next` on an empty queue |
| `busy` | Mutex held by another operation |
| `unauthorized` | Wrong PIN |
| `undo-expired` | 5-second window passed |
| `not-found` | Token or clinic not found |
| `invalid-payload` | Zod validation failed |
| `queue-paused` | `call-next` while paused |
| `already-serving` | `mark-absent` on a non-serving patient |
| `not-in-absent-tray` | `reinstate` on a token not in the tray |

---

## Key Sequence Flows

### 1. Call Next, with undo window

```
Receptionist              Server                         All clients in room
     │                       │                                     │
     │  call-next            │                                     │
     ├──────────────────────►│                                     │
     │                       │  acquire mutex                      │
     │                       │  check isPaused, waiting list        │
     │                       │  snapshot state (deep clone)         │
     │                       │  if previous serving exists:         │
     │                       │    record doneAt, duration            │
     │                       │    write to PatientHistory             │
     │                       │    write to ConsultHistory              │
     │                       │    append to consultHistory[]           │
     │                       │  next = priority waiting OR normal      │
     │                       │  next.status = 'serving'                │
     │                       │  next.calledAt = now                    │
     │                       │  currentToken = next.token               │
     │                       │  store undo snapshot (5s timeout)         │
     │                       │  release mutex                            │
     │                       │                                          │
     │                       ├───────────────────────► queue-update     │
     │                       ├───────────────────────► token-called      │
     │                       │                                          │
     │◄── token-called event (triggers 5s undo timer client-side) ──────┤
     │                       │                                          │
     │           (5s passes, no undo clicked)                           │
     │                       │  snapshot timeout fires, deleted          │
```

### 2. Concurrent Call Next — mutex rejection

```
Receptionist 1            Server               Receptionist 2
     │                       │                       │
     │  call-next            │  call-next            │
     ├──────────────────────►│◄──────────────────────┤
     │                       │                       │
     │                       │  R1 acquires mutex     │
     │                       │  R2 mutex blocked       │
     │                       │                          │
     │◄── queue-update ──────┤                          │
     │                       │  R1 releases mutex        │
     │                       │  R2 acquires mutex          │
     │                       │  R2 processes call-next      │
     │                       │  R2 releases mutex             │
     │                       ├────────────────► queue-update │
```

Two simultaneous calls do not double-advance the queue — the mutex serializes them.

### 3. Mark Absent, then Reinstate

```
Doctor                    Server                        All clients
     │                       │                                │
     │  mark-absent          │                                │
     ├──────────────────────►│                                │
     │                       │  patient.status = 'absent'      │
     │                       │  patient.calledAt = undefined    │
     │                       │  patient.absentCount += 1         │
     │                       │  remove from queue[], add to       │
     │                       │  absentPatients[]                   │
     │                       │  currentToken = null                 │
     │                       │  (not persisted to DB yet)             │
     │                       │                                       │
     │                       ├──────────────────► queue-update        │
     │                       │                                        │
     │                  (patient walks back in)                       │
     │                       │                                        │
Receptionist                 │                                        │
     │  reinstate             │                                       │
     ├──────────────────────►│                                       │
     │                       │  patient.status = 'waiting'             │
     │                       │  patient.reinstatedAt = now               │
     │                       │  move from absentPatients[] to             │
     │                       │  queue[] at chosen position                  │
     │                       │                                              │
     │                       ├──────────────────► queue-update               │
     │                       ├──────────────────► patient-reinstated          │
```

### 4. Doctor notes saved to the database

```
Doctor                    Server                        Database
     │                       │                                │
     │  types note...        │                                │
     │  (800ms debounce)     │                                │
     │  set-notes            │                                │
     ├──────────────────────►│                                │
     │                       │  patient.notes = trimmed text   │
     │                       │  (in-memory only)                │
     │                       ├──► queue-update broadcast          │
     │                       │                                     │
     │  mark-done             │                                    │
     ├──────────────────────►│                                    │
     │                       │  record doneAt, duration             │
     │                       │  write PatientHistory ──────────────►│ INSERT with notes
     │                       │  write ConsultHistory ──────────────►│ INSERT duration
     │                       ├──► queue-update                       │
```

Notes live in memory while the patient is being served, and write to PostgreSQL only when `mark-done` fires. This avoids a database write on every keystroke.

### 5. Reset Queue — session boundary

```
Receptionist               Server                         All clients
     │                       │                                │
     │  reset-queue           │                               │
     ├──────────────────────►│                                │
     │                       │  write all remaining patients to │
     │                       │  PatientHistory as 'skipped'       │
     │                       │  close active ClinicSession          │
     │                       │  create new ClinicSession               │
     │                       │  clear queue[], absentPatients[]          │
     │                       │  reset token counter to 0                   │
     │                       │  sessionStartedAt = now                       │
     │                       │  cancel undo timeout                            │
     │                       │                                                  │
     │                       ├──────────────────► queue-reset event              │
     │                       ├──────────────────► queue-update                     │
     │                       │
     │   Patient with old token (addedAt < new sessionStartedAt)
     │   sees "session ended" banner
```

### 6. Patient with a wrong access token

```
Patient                   Frontend                      Backend
     │                       │                                │
     │  URL with               │                              │
     │  ?token=4&access=WRONG  │                              │
     │                       │                                │
     │                       │  socket connects                │
     │                       ├───────────────────────────────►│
     │                       │  join-clinic                     │
     │                       │  state-sync (full)                  │
     │                       │◄───────────────────────────────┤
     │                       │                                  │
     │                       │  client looks up                  │
     │                       │  token 4 in state                   │
     │                       │  compares access                      │
     │                       │  rawPatient.accessToken                │
     │                       │  !== URL accessToken                     │
     │                       │                                          │
     │  shows "Access denied"  │                                         │
     │◄───────────────────────┤                                         │
```

The server sends full state to all joining sockets. The access check happens client-side — a user could technically inspect the network tab and see all tokens, but cannot *use* any URL except their own.

---

## Data Structures

### Patient

```typescript
{
  token: number              // Auto-incremented per clinic
  name: string
  phone?: string              // 10 digits, Indian format
  clinicId: string
  priority: boolean           // Sorts to front of the waiting group
  status: 'waiting' | 'serving' | 'done' | 'skipped' | 'absent'
  addedAt: number             // Unix ms
  calledAt?: number           // Set when status becomes 'serving'
  doneAt?: number             // Set on mark-done
  absentAt?: number           // Set on mark-absent
  reinstatedAt?: number       // Set on reinstate
  absentCount: number         // Times this patient was marked absent
  accessToken: string         // 16-char random string, prevents URL spoofing
  notes?: string               // Doctor's consultation notes
}
```

### QueueState

```typescript
{
  clinicId: string
  currentToken: number | null   // Currently being served, null if none
  queue: Patient[]               // Active (waiting + serving) only
  absentPatients: Patient[]      // Separate tray, NOT in the main queue
  consultHistory: number[]       // Last 10 real durations, in minutes
  avgConsultTime: number          // Receptionist-set fallback
  isPaused: boolean
  sessionStartedAt: number         // Updated on reset, used for the session boundary
  lastDate: string                  // YYYY-MM-DD, for daily reset detection
}
```

---

## In-Memory Store Keys

The current implementation uses JavaScript `Map`s in process memory.

| Map | Key | Value | Purpose |
|---|---|---|---|
| `stateStore` | `clinicId` | `QueueState` | Full queue for one clinic |
| `tokenCounters` | `clinicId` | `number` | Auto-increment counter |
| `mutexMap` | `clinicId` | `Mutex` | One mutex per clinic |
| `undoSnapshots` | `clinicId` | `{ snapshot, expiresAt, timeoutRef }` | 5s undo window |
| `timers` | `clinicId` | `NodeJS.Timeout` | 60s long-consultation watcher |

If we scaled to multiple server instances, these maps would move to Redis. The current implementation is correct for the single-server deployment this hackathon needs.

---

## REST Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Uptime check |
| `GET` | `/api/history` | Paginated patient history with filters |
| `GET` | `/api/history/export` | CSV download of filtered history |
| `GET` | `/api/session` | Current active session metadata |
| `GET` | `/api/analytics` | Daily stats |

All endpoints accept `clinicId` as a required query parameter.