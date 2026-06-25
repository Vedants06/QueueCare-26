import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F2EFE8]">
      {/* ─── Nav ──────────────────────────────────────────── */}
      <nav className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/QueueCureLogo.png"
            alt="QueueCure logo"
            width={42}
            height={42}
            className="h-9 w-9"
          />
          <span className="text-lg font-semibold text-charcoal tracking-tight">
            QueueCure
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Vedants06/QueueCare-26"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-charcoal/70 hover:text-pulse-green-800 transition-colors"
          >
            GitHub <span className="text-xs">↗</span>
          </a>
          <Link
            href="/receptionist"
            className="rounded-full bg-pulse-green-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pulse-green-900 transition-colors"
          >
            Open Demo
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-24">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-16 items-center">
          {/* Left */}
          <div>
            {/* Eyebrow */}
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pulse-green-800 mb-6">
              Queue Cure &apos;26 — Hackathon submission
            </p>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-charcoal mb-8">
              Replace paper tokens with a queue that actually{' '}
              <span className="text-pulse-green-800">moves.</span>
            </h1>

            {/* Sub */}
            <p className="text-lg text-charcoal/70 mb-8 max-w-xl leading-relaxed">
              Three screens, one mutex, zero refresh. Patients see live position,
              doctors stay on time, receptionists stop juggling paper.
            </p>

            {/* Cold start notice */}
            <div className="mb-8 inline-flex items-start gap-2 rounded-lg bg-amber-alert-50 border border-amber-alert-200 px-3.5 py-2.5 max-w-lg">
              <p className="text-xs text-amber-alert-700 leading-relaxed">
                <span className="font-semibold">Backend hosted on Render free tier.</span> Cold starts take ~30s after 15 min of inactivity. All subsequent requests are real-time.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/receptionist"
                className="group inline-flex items-center gap-2 rounded-full bg-pulse-green-800 px-6 py-3.5 text-sm font-semibold text-white hover:bg-pulse-green-900 transition-all"
              >
                Try Receptionist
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <Link
                href="/display"
                className="inline-flex items-center gap-2 rounded-full border border-charcoal/15 bg-transparent px-6 py-3.5 text-sm font-semibold text-charcoal hover:border-charcoal/35 transition-colors"
              >
                Open Display
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5 text-charcoal/55">
                <span className="status-dot status-dot-pulse bg-pulse-green-700" />
                Live demo
              </span>
              <span className="text-charcoal/30">·</span>
              <span className="font-mono text-charcoal/80">
                PIN <span className="font-semibold">1234</span>
              </span>
              <span className="text-charcoal/30">·</span>
              <span className="font-mono text-charcoal/80">
                Clinic <span className="font-semibold">default</span>
              </span>
            </div>
          </div>

          {/* Right — display card */}
          <div className="relative">
            {/* Floating priority badge */}
            <div className="absolute -top-4 -right-3 z-10 hidden md:flex items-center gap-1.5 rounded-full bg-amber-alert-50 border border-amber-alert-200 px-3 py-1.5 shadow-sm">
              <span className="text-sm">⚡</span>
              <span className="text-xs font-semibold text-amber-alert-700">
                Priority added
              </span>
            </div>

            {/* Main card */}
            <div className="rounded-3xl bg-white/70 border border-charcoal/10 p-8 shadow-sm">
              {/* Top row */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/50">
                  Now Serving
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="status-dot status-dot-pulse bg-pulse-green-700" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-pulse-green-800">
                    Live
                  </span>
                </span>
              </div>

              {/* Big token */}
              <div className="flex items-baseline justify-center mb-8">
                <span className="font-mono text-9xl font-bold leading-none text-charcoal">
                  047
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-charcoal/10 mb-6" />

              {/* Up next mini grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { num: 48, label: 'Next', wait: '~8–14 min' },
                  { num: 49, label: '+1', wait: '~16–22 min' },
                  { num: 50, label: '+2', wait: '~24–30 min' },
                ].map((slot) => (
                  <div
                    key={slot.num}
                    className="rounded-xl bg-[#EAE6DC] p-3 text-center"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-pulse-green-800/70 mb-1">
                      {slot.label}
                    </p>
                    <p className="font-mono text-2xl font-bold text-charcoal leading-none mb-1.5">
                      {slot.num}
                    </p>
                    <p className="text-[10px] text-charcoal/55">{slot.wait}</p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <p className="mt-6 text-center text-xs text-charcoal/55">
                Based on{' '}
                <span className="font-semibold text-charcoal/75">
                  7 real consultations
                </span>{' '}
                · ±30%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Three Screens ─────────────────────────────────── */}
      <section className="bg-white/40 border-y border-charcoal/10 py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pulse-green-800 mb-3">
              The system
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-charcoal tracking-tight">
              Three screens, one live queue
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Receptionist */}
            <Link
              href="/receptionist"
              className="group rounded-2xl bg-white/80 p-6 border border-charcoal/10 hover:border-pulse-green-700/40 hover:bg-white hover:shadow-md transition-all"
            >
              <div className="mb-4 h-12 w-12 rounded-xl bg-pulse-green-800 text-white flex items-center justify-center text-xl font-mono font-bold">
                ⌘
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-1">
                Receptionist
              </h3>
              <p className="text-sm text-charcoal/65 mb-4 leading-relaxed">
                Add patients, call next, mark absent, recall, manage queue.
                Live analytics. PIN-secured.
              </p>
              <p className="text-sm font-semibold text-pulse-green-800 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Open dashboard
                <span>→</span>
              </p>
            </Link>

            {/* Display */}
            <Link
              href="/display"
              className="group rounded-2xl bg-white/80 p-6 border border-charcoal/10 hover:border-pulse-green-700/40 hover:bg-white hover:shadow-md transition-all"
            >
              <div className="mb-4 h-12 w-12 rounded-xl bg-charcoal text-white flex items-center justify-center text-xl">
                ▢
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-1">
                Waiting Room TV
              </h3>
              <p className="text-sm text-charcoal/65 mb-3 leading-relaxed">
                Full-screen kiosk. Toggle between full grid and compact &quot;now
                serving&quot; view from inside.
              </p>
              <p className="text-[11px] text-charcoal/45 mb-4 leading-relaxed">
                Tip: press <span className="font-mono font-semibold">M</span> to switch
                modes
              </p>
              <p className="text-sm font-semibold text-pulse-green-800 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Open display
                <span>→</span>
              </p>
            </Link>

            {/* Doctor */}
            <Link
              href="/doctor"
              className="group rounded-2xl bg-white/80 p-6 border border-charcoal/10 hover:border-pulse-green-700/40 hover:bg-white hover:shadow-md transition-all"
            >
              <div className="mb-4 h-12 w-12 rounded-xl bg-amber-alert text-charcoal flex items-center justify-center text-xl">
                ⚕
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-1">
                Doctor
              </h3>
              <p className="text-sm text-charcoal/65 mb-4 leading-relaxed">
                See current patient, write notes, call next. Focused view, no
                queue management distractions.
              </p>
              <p className="text-sm font-semibold text-pulse-green-800 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Open doctor console
                <span>→</span>
              </p>
            </Link>

            {/* Patient */}
            <Link
              href="/patient?token=1&clinic=default"
              className="group rounded-2xl bg-white/80 p-6 border border-charcoal/10 hover:border-pulse-green-700/40 hover:bg-white hover:shadow-md transition-all"
            >
              <div className="mb-4 h-12 w-12 rounded-xl bg-pulse-green-700 text-white flex items-center justify-center text-xl">
                ▤
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-1">
                Patient Mobile
              </h3>
              <p className="text-sm text-charcoal/65 mb-4 leading-relaxed">
                Accessed via QR code on the token slip. Live position, wait
                estimate, sound alert when next.
              </p>
              <p className="text-sm font-semibold text-pulse-green-800 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Preview patient view
                <span>→</span>
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pulse-green-800 mb-3">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-charcoal tracking-tight">
              From paper slip to live queue
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: '01',
                title: 'Patient checks in',
                body: 'Receptionist adds their name and phone. A QR token slip prints. Patient scans it on their phone to track their position.',
              },
              {
                num: '02',
                title: 'Receptionist calls next',
                body: 'One click advances the queue. Real consultation durations are recorded for accurate future estimates. Priority and absent patients handled cleanly.',
              },
              {
                num: '03',
                title: 'Everyone sees the same queue',
                body: 'TV display updates in under 200ms. Patient phones update instantly. Wait estimates adapt to real consultation patterns.',
              },
            ].map((step) => (
              <div key={step.num}>
                <p className="font-mono text-3xl font-bold text-pulse-green-800 mb-3">
                  {step.num}
                </p>
                <h3 className="text-lg font-semibold text-charcoal mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-charcoal/65 leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Engineering ───────────────────────────────────── */}
      <section className="bg-white/40 border-y border-charcoal/10 py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pulse-green-800 mb-3">
              Engineering
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-charcoal tracking-tight">
              Real problems, real solutions
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Sub-200ms sync',
                body: 'Socket.IO with room-based broadcasting. No polling.',
              },
              {
                title: 'Wait time from real data',
                body: 'Rolling average of last 10 consultations. Outliers excluded. Confidence-adjusted margin.',
              },
              {
                title: 'Absent patient recovery',
                body: 'Patient not present? Move them to the absent tray. Reinstate to front or back when they return.',
              },
              {
                title: 'Concurrency-safe',
                body: 'async-mutex prevents race conditions on call-next, mark-done, and reinstatement.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl bg-white/70 border border-charcoal/10 p-5"
              >
                <h3 className="text-sm font-semibold text-charcoal mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs text-charcoal/65 leading-relaxed">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pulse-green-800 mb-3">
              Built with
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-charcoal tracking-tight">
              Modern tools, deliberate choices
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Next.js 14', detail: 'App Router' },
              { name: 'TypeScript', detail: 'Strict, no any' },
              { name: 'Socket.IO', detail: 'Real-time sync' },
              { name: 'Tailwind v4', detail: 'CSS-native config' },
              { name: 'PostgreSQL', detail: 'Persistent state' },
              { name: 'Prisma', detail: 'Type-safe ORM' },
              { name: 'async-mutex', detail: 'Concurrency control' },
              { name: 'Zod', detail: 'Payload validation' },
            ].map((tech) => (
              <div
                key={tech.name}
                className="rounded-xl bg-white/55 border border-charcoal/10 p-4 text-center"
              >
                <p className="font-mono text-sm font-semibold text-charcoal mb-0.5">
                  {tech.name}
                </p>
                <p className="text-xs text-charcoal/55">{tech.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-charcoal/10">
        <div className="max-w-6xl mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Image
              src="/QueueCureLogo.png"
              alt="QueueCure logo"
              width={42}
              height={42}
              className="h-7 w-7"
            />
            <span className="text-sm font-semibold text-charcoal">
              QueueCure
            </span>
            <span className="text-sm text-charcoal/50 ml-2">
              · Built for Wooble Queue Cure &apos;26
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-charcoal/55">
            <Link href="/receptionist" className="hover:text-charcoal transition-colors">
              Receptionist
            </Link>
            <Link href="/display" className="hover:text-charcoal transition-colors">
              Display
            </Link>
            <a
              href="https://github.com/Vedants06/QueueCare-26"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-charcoal transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}