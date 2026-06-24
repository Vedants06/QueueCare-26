'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import type { TypedSocket } from '@/lib/socket';
import type { PatientAddedPayload, Patient } from '@shared/types';
import QRCode from 'qrcode';

interface QRModalProps {
  socket: TypedSocket;
  manualPatient?: Patient | null;
  onManualClose?: () => void;
  className?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `•••• ${phone.slice(-4)}`;
}

export function QRModal({ socket, manualPatient, onManualClose, className }: QRModalProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onPatientAdded = (payload: PatientAddedPayload) => {
      setPatient(payload.patient);
    };

    socket.on('patient-added', onPatientAdded);
    return () => {
      socket.off('patient-added', onPatientAdded);
    };
  }, [socket]);

  useEffect(() => {
    if (manualPatient) {
      setPatient(manualPatient);
    }
  }, [manualPatient]);

  useEffect(() => {
    if (!patient) {
      setQrSvg('');
      return;
    }

    const url = `${APP_URL}/patient?token=${patient.token}&clinic=${patient.clinicId}&access=${patient.accessToken}`;

    QRCode.toString(url, {
      type: 'svg',
      width: 240,
      margin: 1,
      color: {
        dark: '#1E293B',
        light: '#F2EFE8',
      },
    })
      .then((svg) => setQrSvg(svg))
      .catch((err) => console.error('[QR] Error generating QR code:', err));
  }, [patient]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleClose = useCallback(() => {
    setPatient(null);
    setQrSvg('');
    setCopied(false);
    if (onManualClose) onManualClose();
  }, [onManualClose]);

  const handleCopyLink = useCallback(() => {
    if (!patient) return;
    const url = `${APP_URL}/patient?token=${patient.token}&clinic=${patient.clinicId}&access=${patient.accessToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [patient]);

  if (!patient) return null;

  const patientUrl = `${APP_URL}/patient?token=${patient.token}&clinic=${patient.clinicId}&access=${patient.accessToken}`;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4',
        className
      )}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#F2EFE8] shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none">
        {/* ─── Header ──────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-charcoal/10 bg-white/40">
          <div className="flex items-center gap-2">
            <Image
              src="/QueueCureLogo.png"
              alt="QueueCure"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <div>
              <p className="text-sm font-semibold text-charcoal leading-none">
                QueueCure
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/55 mt-0.5">
                Token Slip
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-charcoal/55 hover:text-charcoal hover:bg-charcoal/5 transition-colors print:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ─── Token Number ────────────────────────────────── */}
        <div className="px-6 py-6 text-center bg-[#F2EFE8]">
          <p className="font-mono text-7xl font-bold text-charcoal leading-none tracking-tight">
            {formatToken(patient.token)}
          </p>

          {/* Patient info */}
          <div className="mt-4">
            <p className="text-base font-semibold text-charcoal">
              {patient.name}
            </p>
            {patient.phone && (
              <p className="text-xs text-charcoal/55 mt-0.5">
                {maskPhone(patient.phone)}
              </p>
            )}
          </div>

          {/* Badges */}
          {patient.priority && (
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-alert px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-charcoal">
                <span>⚡</span>
                Priority Patient
              </span>
            </div>
          )}

          <p className="text-[10px] text-charcoal/45 mt-3 font-mono">
            Added {formatDateTime(new Date(patient.addedAt))}
          </p>
        </div>

        {/* ─── Divider with dashed style ───────────────────── */}
        <div className="relative px-6">
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-dashed border-charcoal/20" />
          <div className="relative flex justify-center">
            <span className="bg-[#F2EFE8] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/45">
              Scan to track
            </span>
          </div>
        </div>

        {/* ─── QR Code ─────────────────────────────────────── */}
        <div className="px-6 py-6 flex justify-center bg-[#F2EFE8]">
          {qrSvg ? (
            <div className="rounded-2xl bg-[#F2EFE8] p-4 border-2 border-charcoal/10">
              <div
                className="[&>svg]:block [&>svg]:h-56 [&>svg]:w-56"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>
          ) : (
            <div className="h-56 w-56 rounded-xl bg-white/40 flex items-center justify-center">
              <p className="text-xs text-charcoal/40">Generating...</p>
            </div>
          )}
        </div>

        {/* ─── Instructions ────────────────────────────────── */}
        <div className="px-6 pb-5 text-center bg-[#F2EFE8]">
          <p className="text-xs text-charcoal/65">
            Open your phone camera, scan the code,
            <br />
            and track your queue position live.
          </p>
        </div>

        {/* ─── URL (collapsible, for testing/copying) ──────── */}
        <div className="px-6 pb-4 print:hidden">
          <button
            onClick={handleCopyLink}
            className="w-full rounded-lg bg-white/60 border border-charcoal/10 hover:border-charcoal/25 px-3 py-2 text-left transition-colors group"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono text-charcoal/50 truncate group-hover:text-charcoal/70">
                {patientUrl}
              </p>
              <span className="text-[10px] font-semibold text-pulse-green-800 shrink-0">
                {copied ? '✓ Copied' : 'Copy link'}
              </span>
            </div>
          </button>
        </div>

        {/* ─── Actions ─────────────────────────────────────── */}
        <div className="px-6 pb-6 flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 rounded-lg bg-pulse-green-800 text-white hover:bg-pulse-green-900 px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
            </svg>
            Print slip
          </button>
          <button
            onClick={handleClose}
            className="rounded-lg bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/30 px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}