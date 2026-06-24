'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatDateTime, formatMinutes, getTodayDate } from '@/lib/formatters';
import type { PatientStatus } from '@shared/types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  className?: string;
}

interface HistoryRecord {
  id: string;
  token: number;
  name: string;
  phone: string | null;
  priority: boolean;
  status: string;
  duration: number | null;
  absentCount: number;
  notes: string | null;
  addedAt: string;
  calledAt: string | null;
  doneAt: string | null;
}

interface HistoryResponse {
  patients: HistoryRecord[];
  total: number;
  pages: number;
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 4) return phone || '—';
  return `•••• ${phone.slice(-4)}`;
}

const statusColors: Record<string, string> = {
  done: 'bg-pulse-green-50 text-pulse-green-800 border-pulse-green-200',
  skipped: 'bg-charcoal/10 text-charcoal/60 border-charcoal/15',
  absent: 'bg-amber-alert-50 text-amber-alert-700 border-amber-alert-200',
};

export function HistoryDrawer({ isOpen, onClose, clinicId, className }: HistoryDrawerProps) {
  const [date, setDate] = useState(getTodayDate());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        clinicId,
        page: String(page),
        limit: '20',
      });

      if (date) params.set('date', date);
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`${SERVER_URL}/api/history?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result: HistoryResponse = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to load history');
      console.error('[HISTORY] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, date, search, statusFilter, page]);

  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen, fetchHistory]);

  useEffect(() => {
    setPage(1);
  }, [date, search, statusFilter]);

  const handleExportCsv = useCallback(() => {
    const params = new URLSearchParams({ clinicId });
    if (date) params.set('date', date);
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);

    // Trigger download by opening URL — browser handles the download
    window.open(`${SERVER_URL}/api/history/export?${params}`, '_blank');
  }, [clinicId, date, search, statusFilter]);

  if (!isOpen) return null;

  const statusTabs: Array<{ value: string; label: string }> = [
    { value: '', label: 'All' },
    { value: 'done', label: 'Done' },
    { value: 'skipped', label: 'Skipped' },
    { value: 'absent', label: 'Absent' },
  ];

  const hasRecords = data && data.patients.length > 0;

  return (
    <div className={cn('fixed inset-0 z-40 flex justify-end', className)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-[#F2EFE8] shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4 bg-[#F2EFE8]">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">
              Patient history
            </h2>
            <p className="text-xs text-charcoal/55 mt-0.5">
              {data?.total ?? 0} record{data?.total !== 1 ? 's' : ''} for selected filters
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-charcoal/55 hover:text-charcoal hover:bg-white/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-charcoal/10 px-6 py-4 bg-[#F2EFE8] space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2 text-sm focus:outline-none focus:border-pulse-green-700"
              />
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 mb-1.5">
                Search
              </label>
              <input
                type="text"
                placeholder="Name, phone, or token"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2 text-sm placeholder:text-charcoal/35 focus:outline-none focus:border-pulse-green-700"
              />
            </div>
          </div>

          {/* Status tabs + export */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    statusFilter === tab.value
                      ? 'bg-charcoal text-white'
                      : 'bg-white text-charcoal/65 border border-charcoal/15 hover:border-charcoal/30'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCsv}
              disabled={!hasRecords}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5',
                hasRecords
                  ? 'bg-pulse-green-800 text-white hover:bg-pulse-green-900'
                  : 'bg-charcoal/10 text-charcoal/35 cursor-not-allowed'
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 rounded-full border-2 border-charcoal/15 border-t-pulse-green-700 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <p className="text-sm text-signal-red mb-2">{error}</p>
              <button
                onClick={fetchHistory}
                className="text-sm text-pulse-green-800 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && data && data.patients.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-charcoal/55 mb-1">No records found</p>
              <p className="text-xs text-charcoal/40">
                Try a different date or remove filters
              </p>
            </div>
          )}

          {!isLoading && !error && hasRecords && (
            <div className="space-y-2">
              {data!.patients.map((record) => (
                <div
                  key={record.id}
                  className="rounded-xl bg-white border border-charcoal/10 p-4 hover:border-charcoal/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Token */}
                    <div className="shrink-0">
                      <p className="font-mono text-base font-bold text-charcoal">
                        #{formatToken(record.token)}
                      </p>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-charcoal">
                          {record.name}
                        </p>
                        {record.priority && (
                          <span className="rounded bg-amber-alert text-charcoal px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                            Priority
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                            statusColors[record.status] || statusColors.skipped
                          )}
                        >
                          {record.status}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-3 text-xs text-charcoal/55 flex-wrap">
                        <span>{maskPhone(record.phone)}</span>
                        {record.duration !== null && (
                          <>
                            <span className="text-charcoal/30">·</span>
                            <span>{formatMinutes(record.duration)}</span>
                          </>
                        )}
                        {record.absentCount > 0 && (
                          <>
                            <span className="text-charcoal/30">·</span>
                            <span className="text-amber-alert-700">
                              Absent {record.absentCount}×
                            </span>
                          </>
                        )}
                        <span className="text-charcoal/30">·</span>
                        <span>{formatDateTime(new Date(record.addedAt))}</span>
                      </div>

                      {/* Notes (if any) */}
                      {record.notes && (
                        <div className="mt-2 rounded-md bg-[#F2EFE8]/60 p-2.5 border border-charcoal/5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal/45 mb-1">
                            Doctor notes
                          </p>
                          <p className="text-xs text-charcoal/75 italic">
                            {record.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="border-t border-charcoal/10 px-6 py-3 bg-[#F2EFE8] flex items-center justify-between">
            <p className="text-xs text-charcoal/55">
              Page {page} of {data.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  page <= 1
                    ? 'bg-charcoal/10 text-charcoal/30 cursor-not-allowed'
                    : 'bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/30'
                )}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  page >= data.pages
                    ? 'bg-charcoal/10 text-charcoal/30 cursor-not-allowed'
                    : 'bg-white text-charcoal border border-charcoal/15 hover:border-charcoal/30'
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}