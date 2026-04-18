'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import Pagination from '@/components/admin/Pagination';
import { getAuditLog } from '@/lib/adminApi';
import type { AuditEntry, Pagination as PaginationMeta } from '@/lib/adminApi';

const ACTION_COLORS: Record<string, string> = {
  kyc_approved: 'text-green-600 bg-green-50',
  kyc_rejected: 'text-red-600 bg-red-50',
  loan_approved: 'text-green-600 bg-green-50',
  loan_rejected: 'text-red-600 bg-red-50',
  loan_disburse_initiated: 'text-blue-600 bg-blue-50',
  loan_disbursed: 'text-blue-600 bg-blue-50',
  loan_applied: 'text-amber-600 bg-amber-50',
  contribution_approved: 'text-green-600 bg-green-50',
  contribution_rejected: 'text-red-600 bg-red-50',
  contribution_credited: 'text-purple-600 bg-purple-50',
  user_edited: 'text-on-surface-variant bg-surface-container-high',
};

export default function AdminAuditLog() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/dashboard'); return; }
  }, [user, isLoading, router]);

  const fetchLog = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await getAuditLog(accessToken, { page, limit: 20 });
      setEntries(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, page]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary">Audit Log</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">All admin actions and system events</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">history</span>
            <p className="text-on-surface-variant">No audit entries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {entries.map((entry) => {
              const colorCls = ACTION_COLORS[entry.action] ?? 'text-on-surface-variant bg-surface-container-high';
              const isOpen = expanded === entry.id;
              return (
                <div key={entry.id} className="px-6 py-4">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : entry.id)}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 mt-0.5 ${colorCls}`}>
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-on-surface">
                          <span className="font-medium">{entry.actor_role === 'admin' ? 'Admin' : 'System'}</span>
                          {' on '}
                          <span className="font-mono text-xs bg-surface-container-high px-1.5 py-0.5 rounded">{entry.collection}</span>
                          {' '}
                          <span className="text-on-surface-variant text-xs">{entry.record_id?.slice(0, 16)}…</span>
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{entry.created_at}</p>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-lg text-on-surface-variant flex-shrink-0 ml-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </div>
                  {isOpen && (
                    <div className="mt-3 ml-0 bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs font-medium text-on-surface-variant mb-2">DIFF / PAYLOAD</p>
                      <pre className="text-xs text-on-surface font-mono overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(entry.diff, null, 2)}
                      </pre>
                      {entry.actor_id && (
                        <p className="text-xs text-on-surface-variant mt-2">Actor ID: {entry.actor_id}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="px-6 pb-4">
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} />
        </div>
      </div>
    </AdminLayout>
  );
}
