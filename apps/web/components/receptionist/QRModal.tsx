'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/formatters';
import type { TypedSocket } from '@/lib/socket';
import type { PatientAddedPayload, Patient } from '@shared/types';
import QRCode from 'qrcode';

interface QRModalProps {
  socket: TypedSocket;
  manualPatient?: Patient | null;       // NEW: opened manually for rescan
  onManualClose?: () => void;           // NEW: close handler for manual open
  className?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

export function QRModal({ socket, manualPatient, onManualClose, className }: QRModalProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [qrSvg, setQrSvg] = useState<string>('');

  // Listen for patient-added events (new patient → auto-show)
  useEffect(() => {
    const onPatientAdded = (payload: PatientAddedPayload) => {
      setPatient(payload.patient);
    };

    socket.on('patient-added', onPatientAdded);
    return () => {
      socket.off('patient-added', onPatientAdded);
    };
  }, [socket]);

  // Sync manualPatient prop into state
  useEffect(() => {
    if (manualPatient) {
      setPatient(manualPatient);
    }
  }, [manualPatient]);

  // Generate QR code when patient changes
  useEffect(() => {
    if (!patient) {
      setQrSvg('');
      return;
    }

    const url = `${APP_URL}/patient?token=${patient.token}&clinic=${patient.clinicId}&access=${patient.accessToken}`;

    QRCode.toString(url, {
      type: 'svg',
      width: 220,
      margin: 2,
      color: {
        dark: '#1E293B',
        light: '#FFFFFF',
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
    if (onManualClose) onManualClose();
  }, [onManualClose]);

  if (!patient) return null;

  const patientUrl = `${APP_URL}/patient?token=${patient.token}&clinic=${patient.clinicId}&access=${patient.accessToken}`;

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4', className)}>
      <div className="rounded-2xl bg-white border border-charcoal/10 max-w-sm w-full shadow-xl overflow-hidden print:shadow-none print:border-none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-charcoal/10 bg-[#F2EFE8]/60">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal/55 mb-1">
            Patient Token
          </p>
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-4xl font-bold text-charcoal leading-none">
              #{formatToken(patient.token)}
            </p>
            <span className="text-xs text-charcoal/55">
              {formatDateTime(new Date(patient.addedAt))}
            </span>
          </div>
        </div>

        {/* Patient info */}
        <div className="px-6 py-4 border-b border-charcoal/10">
          <p className="text-base font-semibold text-charcoal">{patient.name}</p>
          {patient.phone && (
            <p className="text-sm text-charcoal/55 mt-0.5">{patient.phone}</p>
          )}
          {patient.priority && (
            <span className="inline-block mt-2 rounded-md bg-amber-alert text-charcoal px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              ⚡ Priority
            </span>
          )}
        </div>

        {/* QR */}
        <div className="px-6 py-6 text-center">
          {qrSvg && (
            <div className="inline-block rounded-xl border border-charcoal/10 p-3 bg-white">
              <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
          )}
          <p className="text-xs text-charcoal/55 mt-3">
            Scan to track queue position
          </p>
        </div>

        {/* URL (small, for copy/test) */}
        <div className="px-6 pb-3 print:hidden">
          <p className="text-[10px] text-charcoal/40 break-all font-mono">
            {patientUrl}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-charcoal/10 flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold bg-pulse-green-800 text-white hover:bg-pulse-green-900 transition-colors"
          >
            Print slip
          </button>
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}