# QueueCure — Engineering Decisions

This document explains the choices made, the tradeoffs accepted, and the edge cases handled. Written as if explaining the codebase to another engineer joining the project.

## Table of Contents

- [Why This Exists](#why-this-exists)
- [Concurrency and Locking](#concurrency-and-locking)
- [Two-Layer State Architecture](#two-layer-state-architecture)
- [Wait Time Algorithm](#wait-time-algorithm)
- [Absent Patient System](#absent-patient-system)
- [PIN Authentication](#pin-authentication)
- [Patient Access Token](#patient-access-token)
- [Undo Snapshot Stack](#undo-snapshot-stack)
- [Session Boundary on Reset](#session-boundary-on-reset)
- [Daily Consult History Reset](#daily-consult-history-reset)
- [Page Visibility Recovery](#page-visibility-recovery)
- [Stopwatch Resume From Server Timestamp](#stopwatch-resume-from-server-timestamp)
- [Duplicate Patient Guard](#duplicate-patient-guard)
- [Long Consultation Warning](#long-consultation-warning)
- [Indian Phone Validation](#indian-phone-validation)
- [Display Mode Toggle](#display-mode-toggle)
- [CSV Export](#csv-export)
- [Doctor Notes Design](#doctor-notes-design)
- [Edge Cases Handled](#edge-cases-handled)
- [What We Would Do Next](#what-we-would-do-next)
- [What We Built but Didn't Use](#what-we-built-but-didnt-use)
- [Honest Limitations](#honest-limitations)
- [Time Spent](#time-spent)

---

## Why This Exists

The problem statement notes that 76% of Indian clinics still run on paper tokens. The brief asked for two screens — receptionist and waiting room — with live sync. We built four: receptionist, doctor, display, and patient, because the problem actually spans four roles. A queue tool that ignores the doctor and the patient solves the receptionist's problem, not the clinic's.

## Concurrency and Locking

Queue operations are not safe to run in parallel. If two receptionists click **Call Next** at the same time, only one patient should advance — not two, and not the wrong one.

We use `async-mutex`, one instance per clinic. Any operation that mutates state acquires the mutex, does its work, and releases in a `finally` block:

```typescript
const mutex = getMutex(clinicId);
const release = await mutex.acquire();
try {
  // mutation
} finally {
  release();
}
```

The mutex is keyed by `clinicId`, so two clinics on the same server never block each other.

We considered Redis `SET NX` for distributed locking and decided against it. This submission runs as a single server instance — Redis would add a network round-trip per lock acquisition for a benefit that doesn't exist at this scale. If the system needed multiple instances later, we'd replace `async-mutex` with Redis `SET NX` and add the Socket.IO Redis Adapter for cross-instance broadcasting. That swap touches four files — premature for now.

## Two-Layer State Architecture

The active queue lives in memory. Patient history lives in PostgreSQL.

**Active queue** means: who is waiting, who is being served, who is in the absent tray, and the last 10 real consultation durations. This changes on every click. Putting it in PostgreSQL would add a round-trip to every Call Next and every Mark Done — real-time would start to feel laggy.

**Patient history** means: completed consultations, permanently skipped patients, and absent patients eventually skipped for good. This data doesn't need sub-millisecond access — it's audit and analytics, and belongs in a database.

The tradeoff: if the server crashes, the active queue is lost, but patient history survives. On boot, the server queries PostgreSQL for the active session and restores `consultHistory` so wait estimates stay accurate. Active patients are *not* restored, because they were never persisted — this is documented and accepted. Surviving a crash with full active-queue state would require Redis.

## Wait Time Algorithm

A hardcoded fallback like "10 minutes per patient" is wrong by design — the whole point of the product is honest wait times.

The algorithm:

1. Collect the last 10 real consultation durations
2. Compute the mean
3. Exclude outliers (durations greater than 2.5× the mean)
4. Use the cleaned mean as the per-patient estimate
5. For a patient at position *N*, estimated wait = *N* × average, adjusted for time already elapsed on the current consultation
6. Apply a confidence-adjusted margin

### Confidence margin

With zero data points we have no real signal, so the margin is wide. With 10+ data points, the estimate is tight.

| Data points | Margin |
|---|---|
| Fewer than 3 | ±50% (fallback mode) |
| 3 to 5 | ±40% |
| 5 to 10 | ±30% |
| 10 or more | ±20% |

The patient view says "Based on 7 real consultations" when using real data, or "Based on receptionist estimate" when using the fallback. Being transparent about uncertainty matters more than presenting a single confident-looking number.

### Outlier exclusion

A doctor stuck on one patient for 90 minutes shouldn't poison the next 10 patients' estimates. Outliers are still written to the database with `isOutlier: true` — so analytics can show "1 outlier excluded" — but they're excluded from the rolling average itself.

## Absent Patient System

The naive design is: patient isn't present, click Skip, done. That's bad product design.

Real clinics see this constantly — a patient steps out for water and misses their turn. Skipping them permanently means the receptionist has to re-add them, generating a new token and breaking position fairness.

Our design separates **Mark Absent** from **Skip**:

- Mark Absent moves the patient to a separate `absentPatients[]` array, outside the main queue
- `absentCount` increments every time it happens
- Call Next never considers absent patients
- The receptionist sees an absent tray with two actions: **Reinstate to Front** or **Reinstate to Back**
- Reinstate moves the patient back into `queue[]` at the chosen position
- The token number stays the same — the patient's existing QR slip still works
- If the patient never returns, the receptionist can **Skip Permanently**, which removes them from the tray and writes to history

Reinstate-to-front overrides the priority sort, since it's an explicit receptionist decision. Reinstate-to-back respects the priority sort — priority patients still go ahead of normal ones.

We track `absentCount` separately because "absent three times" is relevant context for a receptionist deciding whether to skip a patient permanently.

## PIN Authentication

We didn't build full JWT auth with database-backed accounts — just a 4-digit PIN stored in environment variables.

This is a prototype for a single-clinic deployment. Building accounts, login flows, refresh tokens, and forgot-password emails would add days of work for zero hackathon points. The PIN system still demonstrates:

- Server-side verification (the client can't bypass it)
- Per-role separation (`RECEPTIONIST_PIN`, `DOCTOR_PIN`)
- Attempt limiting (3 wrong tries → 30-second cooldown)
- PIN stored only in React state, never in browser storage
- PIN cleared automatically when the tab closes

An earlier version had a bug where the client trusted any 4-digit input. We fixed it with a `verify-pin` socket event: the client sends a PIN, the server checks it against the env variable, and responds only with `{ valid: true/false }`. The client never learns the real PIN — the server stays the source of truth.

**Production path:** each receptionist and doctor would have an account in PostgreSQL with a bcrypt-hashed password, a JWT issued on login, scoped to their `clinicId`. That's a different scope than this submission.

## Patient Access Token

The patient view URL contains the token number. Without protection, anyone could change `?token=4` to `?token=1` and see someone else's queue position.

**Fix:** when a patient is added, the server generates a 16-character random string (`accessToken`). The QR code URL includes `&access=ABC123XYZ...`. The patient screen verifies that the URL's access token matches the patient record's. A mismatch shows "Access denied".

The character set excludes ambiguous characters (`0`, `O`, `1`, `I`) so a handwritten token stays unambiguous, though we expect everyone to scan the QR code instead.

The state sync sends the full queue to every joining socket, so a technically curious user could open dev tools and see every patient's access token. We accept this — the threat model is "casual URL tampering by a patient," not "active attacker with dev tools." A production system with stricter requirements would partition state sync per role.

## Undo Snapshot Stack

The 5-second undo window after Call Next works by deep-cloning the entire `QueueState` before the mutation. If undo fires within 5 seconds, that snapshot is restored wholesale.

We chose a full deep clone over reverting individual fields because it:

- Keeps the code simple — one function: `JSON.parse(JSON.stringify(state))`
- Handles cascading changes (implicit done-duration recording, `consultHistory` append, `currentToken` change) in a single operation
- Can't accidentally miss a field

The snapshot lives in a `Map` keyed by `clinicId`, alongside a `setTimeout` reference. A new Call Next cancels the old timeout and replaces the snapshot. After 5 seconds, the snapshot is deleted.

If multiple receptionists share a clinic, only the most recent Call Next is undoable.

## Session Boundary on Reset

Reset Queue clears the active queue and starts fresh. But a patient might still have an old token URL open on their phone, showing stale position data from before the reset. Without a boundary, that data would be misleading.

We store `sessionStartedAt` on the queue state, updated on every reset. The patient page checks `patient.addedAt < state.sessionStartedAt` and, if true, shows "This session has ended" — telling the patient their token is no longer valid.

## Daily Consult History Reset

`consultHistory` shouldn't carry over across days — yesterday's slow afternoon shouldn't poison this morning's estimates.

When any socket event arrives, we check `state.lastDate !== today`. If it's a new day, we:

1. Clear `consultHistory` in memory
2. Close the previous `ClinicSession` in the database
3. Create a new `ClinicSession`
4. Update `lastDate` and `sessionStartedAt`

Estimates start each morning in fallback mode and tighten as the day progresses — the correct behavior.

## Page Visibility Recovery

Browser tabs in the background get throttled, and WebSocket connections can pause. The display TV running unattended for eight hours is the worst case.

We use the Page Visibility API: when `visibilityState` becomes `'visible'`, we re-emit `join-clinic`, which triggers a fresh `state-sync` from the server. This is wired up on receptionist, display, doctor, and patient screens.

Combined with Socket.IO's automatic reconnect, this means that even after a 10-minute network drop, returning to the tab shows correct state within about 100 milliseconds.

## Stopwatch Resume From Server Timestamp

The "elapsed" timer on the serving patient card shows `MM:SS`. A naive implementation starts at `00:00` and increments — which breaks on page refresh.

Instead, every patient has a `calledAt` Unix timestamp set by the server. The stopwatch computes `(now - calledAt) / 1000` on every tick. On page refresh, the timer immediately shows the correct elapsed time. On server restart, the timer is only wrong for as long as it takes the server to restore state.

A small detail judges might not notice, but real users would.

## Duplicate Patient Guard

A receptionist clicks Add twice by accident. Without protection, the same patient gets two tokens.

Server-side check: if the new patient's phone matches anyone already in `queue[]` or `absentPatients[]` within the last 30 seconds, we emit `duplicate-warning` instead of adding. The receptionist sees a dialog with the existing token and can confirm to add anyway or cancel.

Thirty seconds covers the "double click" case without blocking a legitimate second visit (or a family sharing one phone number).

## Long Consultation Warning

If a doctor takes 30 minutes on a patient when the average is 10, every other wait estimate becomes inaccurate — the receptionist needs to know.

A server-side `setInterval` runs every 60 seconds per active clinic. If the serving patient's elapsed time exceeds 2× the average, we emit `consultation-warning` to the clinic room, and the receptionist screen shows an amber toast.

This is purely informational — the queue doesn't block and the patient isn't marked anything. The warning clears automatically when the next `mark-done` arrives.

## Indian Phone Validation

Phone is optional, but if provided, it must be a valid Indian mobile number:

1. Strip non-digit characters
2. Strip a leading `91` country code if the total is 12 digits
3. Must be exactly 10 digits
4. Must start with `6`, `7`, `8`, or `9` (per TRAI numbering)

Empty input is valid, since phone is optional. Validation runs on both the client (immediate feedback) and the server (defense in depth, via the Zod schema).

The form's helper text reads "10-digit Indian mobile, +91 prefix auto-stripped," and errors are specific — "Phone must be 10 digits" or "Indian mobile must start with 6, 7, 8, or 9" — rather than a generic "invalid phone."

## Display Mode Toggle

The display TV has two modes:

- **Full** — now serving + up next grid (8 cards)
- **Compact** — now serving only

We initially shipped these as two separate URLs with no UI to switch between them, which meant judges and real users would never discover compact mode.

**Fix:** a corner button on the display toggles modes, updating the URL without a reload. `localStorage` remembers the choice for next time, and the `M` key also toggles it (useful for kiosks with remote controls). The button is small enough not to dominate the screen but discoverable enough to find within five seconds.

## CSV Export

The history drawer shows patient records with filters (date, search, status). Exporting that filtered view was a small addition — a new REST endpoint, `/api/history/export`, that calls the same query as the drawer but without pagination, then formats the result as CSV with proper escaping.

We considered a fancier export UI with column selection and decided against it. The CSV already includes every useful column; real clinics will open it in Excel and filter further if they need to. Column selection would have been feature creep.

## Doctor Notes Design

The doctor screen has a textarea for consultation notes, which raised two design questions.

**When are notes saved?** Auto-saving on every keystroke is wasteful; saving only on `mark-done` risks losing notes if the doctor closes the tab early. We landed on an 800ms debounced auto-save while typing, plus a final write on `mark-done` that includes the latest text — the best of both.

**Who sees notes?**

- Doctor — yes, editing them directly
- Receptionist — yes, in the history drawer for context
- Patient — no, never

This matches real clinical practice: notes use doctor-to-doctor shorthand that patients could easily misread.

## Edge Cases Handled

Each row below is a real scenario we tested, with its detection method and resolution.

| # | Scenario | Detection | Resolution |
|---|---|---|---|
| 1 | Empty queue, click Call Next | `waiting.length === 0` | `empty-queue` error, no state change |
| 2 | Two simultaneous Call Next clicks | Mutex lock check | Mutex serializes; second emits `busy` |
| 3 | Network drop on patient | Socket disconnect | Auto-reconnect → `join-clinic` re-sync |
| 4 | Network drop on display TV | Socket disconnect | Reconnecting overlay shown; Page Visibility forces sync on tab focus |
| 5 | Server restart | Startup routine | DB query restores active session; active queue starts empty (documented) |
| 6 | Stale tab after long inactivity | Page Visibility API | Forces `join-clinic`, gets fresh state |
| 7 | Doctor stuck on one patient | Server 60s timer | `consultation-warning` after 2× average elapsed |
| 8 | Duplicate add within 30s | Phone match check | `duplicate-warning` with existing token |
| 9 | All patients skipped | Queue empty check | Empty state shown, `currentToken` becomes `null` |
| 10 | Priority patient added while paused | `priority && isPaused` | `priority-alert` to receptionist socket only |
| 11 | Reset queue mid-session | `reset-queue` event | `sessionStartedAt` updates; old views show "session ended" |
| 12 | New calendar day | `lastDate !== today` | `consultHistory` cleared, new `ClinicSession`, fallback avg until 3 new points |
| 13 | Outlier consultation duration | `duration > 2.5 × mean` | Flagged in DB, excluded from rolling average |
| 14 | Stopwatch after reconnect | `calledAt` timestamp | Initialized from server time, not zero |
| 15 | Mark Done with no serving patient | `currentToken === null` | `not-found` error |
| 16 | Wrong PIN | PIN mismatch | `unauthorized` error, no state change, attempt counter increments |
| 17 | Undo after 5s | Snapshot timestamp check | `undo-expired` error |
| 18 | New Call Next while undo pending | New call-next arrives | Old timeout cancelled, new snapshot, fresh 5s window |
| 19 | Browser tab throttling on TV | Page Visibility API | Forces a fresh state sync |
| 20 | Add patient during reset | Mutex on reset handler | Post-reset patient gets token #1 of the new session |
| 21 | Absent patient after session reset | `addedAt < sessionStartedAt` | Absent tray cleared; patient sees "session ended" |
| 22 | Reinstate while queue is paused | `isPaused === true` | Reinstate succeeds; Call Next stays blocked |
| 23 | Patient marked absent multiple times | Per-occurrence increment | `absentCount` increments each time, shown in tray |
| 24 | Reinstate while another mutex op runs | Mutex queueing | Reinstate queues, executes after lock releases |
| 25 | Call Next with only absent patients | `waiting.length === 0` | `empty-queue` error; absent tray stays visible |
| 26 | Wrong PIN three times | Attempt counter | 30-second cooldown, client and server enforced |
| 27 | PIN correct on screen, wrong on server | Server env mismatch | `unauthorized` toast, re-prompt |
| 28 | Absent patient's URL still open | `state-sync` on reconnect | Shows current absent state immediately |
| 29 | All `consultHistory` entries are outliers | `clean.length === 0` | Falls back to receptionist's average |
| 30 | URL tampering with token number | Access token mismatch | "Access denied" shown |
| 31 | Notes typed for a patient later marked absent | Notes only persist on `mark-done` | Notes are lost — acceptable, since no consultation occurred |
| 32 | Phone number with country code | Pattern strip | `+91`, `91`, with or without spaces/dashes, auto-stripped |
| 33 | Spaces inside a phone number | Pre-validation strip | Stripped before validation runs |
| 34 | Display mode preference | `localStorage` | Remembered across visits; URL param overrides if set |

## What We Would Do Next

Left out, with reasons:

- **SMS or WhatsApp alerts** when a patient reaches position 1. Requires a Twilio/Meta integration — out of scope for a hackathon. The patient view's chime is the demo-friendly substitute.
- **Multi-doctor routing** with patient-to-doctor assignment. Real clinics often have multiple doctors. The design supports it structurally (a `doctorId` field on patients), but the UI complexity wasn't worth it for this submission.
- **Appointment booking** so patients can pre-book a slot. A different product entirely.
- **Analytics dashboard with charts.** The current strip is real-time only; historical trends would need a charting library and a dedicated page.
- **Multi-clinic SaaS onboarding.** The codebase already supports multiple clinics via `clinicId` — we just hardcoded `'default'` for the demo.

## What We Built but Didn't Use

- The Page Visibility API is wired up on all four pages, but only really matters for the display TV.
- A soundless fallback via a Web Audio API oscillator if `chime.mp3` fails to load. Rarely triggers, doesn't hurt.
- The long consultation warning rarely fires in demos, since we mark patients done quickly — real clinics would see it more often.

## Honest Limitations

- The active queue lives in memory only. A server restart loses waiting/serving patients — documented and accepted for this scope.
- Render's free tier sleeps after 15 minutes of inactivity. Wake it before a demo by hitting `/health`.
- Patient access tokens are visible in the full `state-sync` payload. Acceptable for the threat model (casual URL changing), not for hostile environments.
- No SMS notifications when position changes — the patient has to keep the tab open.
- No rate limiting on socket events. A malicious client could flood the server — out of scope for this hackathon.
- No multi-region deployment. Latency outside India might feel sluggish.

## Time Spent

| Area | Share | Notes |
|---|---|---|
| Backend handlers and server logic | ~30% | Getting the edge cases and mutex flows right was the hard part |
| Frontend components | ~50% | Receptionist, doctor, and patient screens went through 2–3 design iterations; display TV stayed simple |
| Deployment and bug fixing | ~15% | Render's Prisma quirks and Tailwind v4's CSS-native config took some debugging |
| Documentation | ~5% | This file, the socket diagram, and the README |

We didn't write automated tests. For a hackathon, manually testing the 34 edge cases above was more productive than building a test suite that proves the same things.