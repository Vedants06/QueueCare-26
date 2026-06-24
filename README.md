<div align="center">

# QueueCure

**Real-time clinic queue management — no paper tokens, no guesswork, no refresh.**

Built for Queue Cure '26 by Wooble Software

[Live Demo](https://queue-care-26-web.vercel.app) · [Socket Architecture](./docs/SOCKET_DIAGRAM.md) · [Engineering Decisions](./docs/THOUGHT_PROCESS.md)

</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [What QueueCure Does](#what-queuecure-does)
- [Screens](#screens)
- [Live Demo](#live-demo)
- [Feature Summary](#feature-summary)
- [Tech Stack](#tech-stack)
- [What We Deliberately Did Not Use](#what-we-deliberately-did-not-use)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
- [Testing the Flow](#testing-the-flow)
- [Submission Deliverables](#submission-deliverables)

---

## The Problem

76% of India's 1.5 million clinics still run on paper token slips. Patients wait two to three hours with no idea when they'll be called. Receptionists manage the queue from memory. Doctors have no dashboard. Wait-time estimates simply don't exist.

QueueCure solves the visibility problem first: **one queue, four screens, always in sync.**

## What QueueCure Does

Patient scans a QR code and sees their position and estimated wait. Receptionist or doctor clicks **Call Next** and every connected screen updates in under 200ms — no polling, no page refresh, no paper.

## Screens

| Screen | Route | Used by | Auth |
|---|---|---|---|
| Receptionist Dashboard | `/receptionist` | Front desk staff | PIN `1234` |
| Doctor Console | `/doctor` | Consulting doctor | PIN `5678` |
| Display TV | `/display` | Waiting room screen | None |
| Patient Tracker | `/patient?token=N&clinic=X&access=Y` | Patients, via QR | Access token in URL |

## Live Demo

| | |
|---|---|
| **Frontend** | https://queue-care-26-web.vercel.app |
| **Backend** | https://queuecure-server.onrender.com |
| **Receptionist PIN** | `1234` |
| **Doctor PIN** | `5678` |
| **Default clinic ID** | `default` |

## Feature Summary

<details>
<summary><strong>Core queue operations</strong></summary>

| Feature | Notes |
|---|---|
| Real-time sync across all screens | Socket.IO rooms, sub-200ms |
| Priority patient flag | Sorts to front of the waiting group |
| Absent patient tray | Mark absent → reinstate to front/back, or skip permanently |
| Mark as Done with duration tracking | Real consultation time saved to history |
| 5-second undo on Call Next | Full state snapshot restore, not field-by-field |
| Pause and resume queue | Blocks Call Next, shows overlay on display |
| Reset queue (danger zone) | Double confirmation, starts a new session |
| Duplicate patient guard | Flags same phone number within 30 seconds |

</details>

<details>
<summary><strong>Wait time intelligence</strong></summary>

| Feature | Notes |
|---|---|
| Wait time from rolling average | Last 10 real consultations, outliers excluded |
| Confidence-adjusted margin | ±50% with no data down to ±20% with 10+ data points |
| Long consultation warning | Server timer alerts receptionist past 2x average |
| Daily consult history reset | New calendar day starts with a clean average |

</details>

<details>
<summary><strong>Reliability & recovery</strong></summary>

| Feature | Notes |
|---|---|
| Session boundary after reset | Old patient links show "session ended" |
| Page Visibility recovery | Returning to the tab forces a full state sync |
| Stopwatch resume from server | Survives reconnects and refreshes |
| Server restart recovery | Active session rebuilt from the database on boot |

</details>

<details>
<summary><strong>Security & access</strong></summary>

| Feature | Notes |
|---|---|
| Receptionist PIN auth | Verified server-side, never stored client-side |
| Doctor PIN auth | Separate PIN from receptionist |
| 3-attempt cooldown | 30-second lockout after repeated wrong PIN entry |
| Patient access token | Prevents URL tampering between patients |

</details>

<details>
<summary><strong>Patient & display experience</strong></summary>

| Feature | Notes |
|---|---|
| QR code slip with print | Generated client-side, no server round trip |
| QR rescan from queue | Quick action next to Skip |
| Patient mobile view | Live position, wait estimate, chime when next |
| Display TV with grid | Now Serving + up to 8 "up next" cards |
| Display compact mode | Press `M` to toggle, persists in localStorage |

</details>

<details>
<summary><strong>Doctor & analytics</strong></summary>

| Feature | Notes |
|---|---|
| Doctor consultation notes | Auto-saves to the database, visible in history |
| Patient history with filters | Date, search, status |
| CSV export of history | Respects active filters |
| Live analytics strip | Served, skipped, absent, throughput |
| Indian phone validation | 10 digits starting 6–9, auto-strips `+91` |
| Spacebar shortcut for Call Next | On the receptionist screen |

</details>

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | File-based routing, zero-config Vercel deploys |
| Language | TypeScript (strict, no `any`) | Catches socket payload mismatches at compile time |
| Styling | Tailwind CSS v4 | CSS-native config, fast iteration |
| UI primitives | shadcn/ui | Components we own, no library lock-in |
| Animations | Framer Motion | Token transitions, banners, pause overlay |
| Real-time transport | Socket.IO | Rooms, automatic reconnection, named events |
| Backend runtime | Node.js + Express | Persistent process required for WebSocket connections |
| Concurrency control | async-mutex | Per-clinic mutex, prevents race conditions on Call Next |
| Validation | Zod | Runtime checks on every socket payload |
| Database | PostgreSQL (Neon) | Patient history, consultation history, session state |
| ORM | Prisma 5 | Type-safe queries, managed migrations |
| QR generation | qrcode (npm) | Client-side SVG, no server round trip |
| Frontend hosting | Vercel | Zero-config Next.js deployment |
| Backend hosting | Render | Free tier, simple GitHub integration |
| Database hosting | Neon | Free, always-on Postgres |

## What We Deliberately Did Not Use

These are scoped decisions, not gaps.

| Tool | Why not |
|---|---|
| Redis | `async-mutex` gives identical mutex semantics for a single server instance, with no network round-trip. Upgrade path to Redis SET NX is documented for horizontal scaling. |
| Full JWT auth | PIN is the right scope for a single-clinic prototype. Production auth path is documented separately. |
| PWA / service workers | A real-time queue tracker gains nothing from an offline shell — offline data is stale data. |
| GraphQL subscriptions | Socket.IO's named events and room broadcasting are purpose-built for this event model. |
| Polling | Explicitly ruled out by the "live updates without refresh" evaluation criteria. |

## Project Structure

```
queue-care/
├── apps/
│   ├── server/                 Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── handlers/       One file per socket event
│   │   │   ├── lib/            Pure utilities — mutex, validation, wait-time math
│   │   │   ├── db/             Prisma access layer
│   │   │   ├── routes/         REST endpoints
│   │   │   ├── startup/        Session restore on boot
│   │   │   ├── types.ts        Shared types
│   │   │   └── index.ts        Server entry point
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   └── web/                    Next.js 14 frontend
│       ├── app/
│       │   ├── page.tsx              Landing page
│       │   ├── receptionist/         Receptionist dashboard
│       │   ├── doctor/               Doctor console
│       │   ├── display/              TV display
│       │   └── patient/              Patient mobile view
│       ├── components/
│       │   ├── receptionist/         15 components
│       │   ├── doctor/               Uses the receptionist PIN gate
│       │   ├── display/              5 components
│       │   ├── patient/              7 components
│       │   └── shared/               Logo, badges, error boundary
│       ├── hooks/                    6 React hooks
│       └── lib/                      Socket singleton, formatters, sounds
│
├── shared/
│   └── types.ts                Shared TypeScript types
│
├── docs/
│   ├── SOCKET_DIAGRAM.md       Architecture and event reference
│   └── THOUGHT_PROCESS.md      Engineering decisions and edge cases
│
└── package.json                npm workspaces root
```

## Local Setup

### Prerequisites

- Node.js 18+
- A PostgreSQL connection string (Neon, Supabase, or local Postgres)
- npm

### Install

```bash
git clone https://github.com/Vedants06/QueueCare-26.git
cd queue-care
npm install
```

### Environment variables

**`apps/server/.env`**

```env
PORT=4000
DATABASE_URL=postgresql://user:password@host:5432/dbname
FRONTEND_URL=http://localhost:3000
RECEPTIONIST_PIN=1234
DOCTOR_PIN=5678
```

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Generate the Prisma client

```bash
cd apps/server
npx prisma generate
npx prisma db push
```

### Run both apps

```bash
# Terminal 1
cd apps/server
npm run dev

# Terminal 2
cd apps/web
npm run dev
```

Open **http://localhost:3000**

## Deployment

Three services, three providers, all on free tiers.

| Service | Provider |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Neon (PostgreSQL) |

### Vercel — frontend

- **Root directory:** `apps/web`
- **Environment variables:**
  - `NEXT_PUBLIC_SERVER_URL` — Render backend URL
  - `NEXT_PUBLIC_APP_URL` — Vercel deployment URL

### Render — backend

- **Root directory:** `apps/server`
- **Build command:**
  ```bash
  npm install && npx prisma generate && npm run build
  ```
- **Start command:**
  ```bash
  npx prisma db push --accept-data-loss && node dist/index.js
  ```
- **Environment variables:**
  - `DATABASE_URL` — Neon connection string
  - `FRONTEND_URL` — Vercel URL
  - `RECEPTIONIST_PIN` — `1234`
  - `DOCTOR_PIN` — `5678`
  - `NODE_ENV` — `production`
  - `PORT` — `4000`

## Testing the Flow

1. Open `/receptionist` and enter PIN `1234`.
2. Add three patients.
3. Open `/display` in another tab.
4. Open `/patient?token=2&clinic=default&access=...` — get the full URL from the QR modal.
5. Open `/doctor` in another tab and enter PIN `5678`.
6. Click **Call Next** on either the receptionist or doctor screen.
7. Watch all four screens update instantly.
8. Type a note on the doctor screen, then click **Mark Done**.
9. Open the history drawer on the receptionist screen and confirm the note was saved.
10. Click **Export CSV**.

## Submission Deliverables

- This README
- [`docs/SOCKET_DIAGRAM.md`](./docs/SOCKET_DIAGRAM.md) — event reference and sequence diagrams
- [`docs/THOUGHT_PROCESS.md`](./docs/THOUGHT_PROCESS.md) — engineering decisions and edge cases
- Live deployment: https://queue-care-26-web.vercel.app
- Demo video — submitted separately to Wooble