'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TokenDisplay } from '@/components/shared/TokenDisplay';
import { formatDateTime } from '@/lib/formatters';
import type { TypedSocket } from '@/lib/socket';
import type { PatientAddedPayload, Patient } from '@shared/types';
import QRCode from 'qrcode';

interface QRModalProps {
  socket: TypedSocket;
  className?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function QRModal({ socket, className }: QRModalProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [qrSvg, setQrSvg] = useState<string>('');

  // Listen for patient-added events
  useEffect(() => {
    const onPatientAdded = (payload: PatientAddedPayload) => {
      setPatient(payload.patient);
    };

    socket.on('patient-added', onPatientAdded);
    return () => {
      socket.off('patient-added', onPatientAdded);
    };
  }, [socket]);

  // Generate QR code when patient changes
  useEffect(() => {
    if (!patient) {
      setQrSvg('');
      return;
    }

    const url = `${APP_URL}/patient?token=${patient.token}&clinic=${patient.clinicId}&access=${patient.accessToken}`;
    console.log('[QR DEBUG]', { url, patientAccessToken: patient.accessToken, fullPatient: patient });

    QRCode.toString(url, {
      type: 'svg',
      width: 200,
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
  }, []);

  if (!patient) return null;

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/40', className)}>
      <div className="qc-card max-w-sm mx-4 shadow-xl text-center print:shadow-none print:border-none">
        {/* Header */}
        <div className="mb-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Token Slip</p>
          <TokenDisplay token={patient.token} size="lg" />
        </div>

        {/* Patient info */}
        <p className="text-base font-medium text-charcoal mb-0.5">{patient.name}</p>
        {patient.phone && (
          <p className="text-sm text-text-muted mb-1">{patient.phone}</p>
        )}
        <p className="text-xs text-text-muted mb-4">
          {formatDateTime(new Date(patient.addedAt))}
        </p>

        <p className="text-xs text-charcoal/60 break-all px-4 mb-3">
          {`${APP_URL}/patient?token=${patient.token}&clinic=${patient.clinicId}&access=${patient.accessToken}`}
        </p>

        {/* QR Code */}
        {qrSvg && (
          <div className="flex justify-center mb-4">
            <div
              className="inline-block rounded-lg border border-gray-200 p-2 bg-white"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
        )}

        <p className="text-xs text-text-muted mb-4">
          Scan to track your queue position
        </p>

        {/* Actions — hidden when printing */}
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-clinic-blue text-white hover:bg-clinic-blue-600'
            )}
          >
            🖨 Print
          </button>
          <button
            onClick={handleClose}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-gray-100 text-charcoal hover:bg-gray-200'
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}