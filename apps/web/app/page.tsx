import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-surface flex flex-col items-center justify-center p-6">
      <Logo size="lg" className="mb-8" />

      <h1 className="text-2xl font-semibold text-charcoal mb-2 text-center">
        Real-time Clinic Queue Management
      </h1>
      <p className="text-text-muted text-center max-w-md mb-10">
        Replace paper tokens with live digital queues.
        Patients scan a QR code to track their position.
      </p>

      <div className="grid gap-4 w-full max-w-sm">
        {/* Receptionist */}
        <Link
          href="/receptionist"
          className="qc-card flex items-center gap-4 hover:border-clinic-blue hover:shadow-md transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-clinic-blue-50 flex items-center justify-center text-2xl shrink-0 group-hover:bg-clinic-blue-100 transition-colors">
            🖥
          </div>
          <div>
            <p className="font-semibold text-charcoal">Receptionist Dashboard</p>
            <p className="text-xs text-text-muted">Manage queue, call patients, view analytics</p>
          </div>
        </Link>

        {/* Display */}
        <Link
          href="/display"
          className="qc-card flex items-center gap-4 hover:border-clinic-blue hover:shadow-md transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-carbon flex items-center justify-center text-2xl shrink-0">
            📺
          </div>
          <div>
            <p className="font-semibold text-charcoal">Waiting Room Display</p>
            <p className="text-xs text-text-muted">Full-screen TV showing current and upcoming tokens</p>
          </div>
        </Link>

        {/* Display Minimal */}
        <Link
          href="/display?mode=minimal"
          className="qc-card flex items-center gap-4 hover:border-clinic-blue hover:shadow-md transition-all group"
        >
          <div className="h-12 w-12 rounded-xl bg-carbon flex items-center justify-center text-2xl shrink-0">
            📺
          </div>
          <div>
            <p className="font-semibold text-charcoal">Display — Minimal Mode</p>
            <p className="text-xs text-text-muted">Shows only the currently serving token (for corridor TVs)</p>
          </div>
        </Link>

        {/* Patient info */}
        <div className="qc-card flex items-center gap-4 opacity-70">
          <div className="h-12 w-12 rounded-xl bg-pulse-green-50 flex items-center justify-center text-2xl shrink-0">
            📱
          </div>
          <div>
            <p className="font-semibold text-charcoal">Patient View</p>
            <p className="text-xs text-text-muted">Patients access via QR code on their token slip</p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs text-text-muted text-center">
        Queue Cure &apos;26 Hackathon Submission
      </p>
    </div>
  );
}