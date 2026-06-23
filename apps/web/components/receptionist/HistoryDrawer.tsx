'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TokenDisplay } from '@/components/shared/TokenDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: HistoryResponse = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to load history');
      console.error('[HISTORY] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clinicId, date, search, statusFilter, page]);

  // Fetch on filter change
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [date, search, statusFilter]);

  if (!isOpen) return null;

  const statusTabs: Array<{ value: string; label: string }> = [
    { value: '', label: 'All' },
    { value: 'done', label: 'Done' },
    { value: 'skipped', label: 'Skipped' },
    { value: 'absent', label: 'Absent' },
  ];

  return (
    <div className={cn('fixed inset-0 z-40 flex justify-end', className)}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-charcoal">Patient History</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted hover:text-charcoal hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 px-4 py-3 space-y-3">
          {/* Date picker */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-blue/30 focus:border-clinic-blue"
          />

          {/* Search */}
          <input
            type="text"
            placeholder="Search name, phone, or token"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-clinic-blue/30 focus:border-clinic-blue"
          />

          {/* Status filter tabs */}
          <div className="flex gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === tab.value
                    ? 'bg-clinic-blue text-white'
                    : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-clinic-blue animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-signal-red mb-2">{error}</p>
              <button
                onClick={fetchHistory}
                className="text-sm text-clinic-blue hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && data && data.patients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-muted">No records found for this date</p>
              <p className="text-xs text-text-muted mt-1">
                Try a different date or search term
              </p>
            </div>
          )}

          {!isLoading && !error && data && data.patients.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-1 text-xs font-medium text-text-muted uppercase">Token</th>
                  <th className="text-left py-1.5 px-1 text-xs font-medium text-text-muted uppercase">Name</th>
                  <th className="text-left py-1.5 px-1 text-xs font-medium text-text-muted uppercase">Status</th>
                  <th className="text-left py-1.5 px-1 text-xs font-medium text-text-muted uppercase">Duration</th>
                  <th className="text-left py-1.5 px-1 text-xs font-medium text-text-muted uppercase hidden sm:table-cell">Absent</th>
                </tr>
              </thead>
              <tbody>
                {data.patients.map((record) => (
                  <tr key={record.id} className="border-b border-gray-50">
                    <td className="py-2 px-1">
                      <TokenDisplay token={record.token} size="sm" />
                    </td>
                    <td className="py-2 px-1">
                      <p className="font-medium text-charcoal text-xs">{record.name}</p>
                      {record.phone && (
                        <p className="text-xs text-text-muted">{record.phone}</p>
                      )}
                    </td>
                    <td className="py-2 px-1">
                      <StatusBadge status={record.status as PatientStatus} />
                    </td>
                    <td className="py-2 px-1 text-xs text-text-muted">
                      {record.duration !== null
                        ? formatMinutes(record.duration)
                        : '—'}
                    </td>
                    <td className="py-2 px-1 text-xs text-text-muted hidden sm:table-cell">
                      {record.absentCount > 0 ? `${record.absentCount}×` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Page {page} of {data.pages} ({data.total} records)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  page <= 1
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                )}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  page >= data.pages
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-100 text-charcoal hover:bg-gray-200'
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