'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/StatusBadge';
import Modal from '@/components/admin/Modal';
import Pagination from '@/components/admin/Pagination';
import { getUsers, reviewKyc } from '@/lib/adminApi';
import type { UserRow, Pagination as PaginationMeta } from '@/lib/adminApi';

export default function AdminKYC() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [members, setMembers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Action modal
  const [actionModal, setActionModal] = useState<{ open: boolean; userId: string; name: string; action: 'approved' | 'rejected' }>({
    open: false, userId: '', name: '', action: 'approved',
  });
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/dashboard'); return; }
  }, [user, isLoading, router]);

  const fetchMembers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filter !== 'all') params.kyc_status = filter;
      const res = await getUsers(accessToken, params);
      setMembers(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter, page]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openAction = (userId: string, name: string, action: 'approved' | 'rejected') => {
    setActionModal({ open: true, userId, name, action });
    setReason('');
    setActionError('');
  };

  const handleAction = async () => {
    if (!accessToken) return;
    setActionLoading(true);
    setActionError('');
    try {
      await reviewKyc(accessToken, actionModal.userId, actionModal.action, reason);
      setActionModal((m) => ({ ...m, open: false }));
      showToast(`KYC ${actionModal.action} for ${actionModal.name}`);
      fetchMembers();
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = members.filter(
    (m) =>
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const FILTERS = [
    { value: 'pending', label: 'Pending', icon: 'schedule' },
    { value: 'approved', label: 'Approved', icon: 'check_circle' },
    { value: 'rejected', label: 'Rejected', icon: 'cancel' },
    { value: 'all', label: 'All', icon: 'group' },
  ];

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;
  }

  return (
    <AdminLayout>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">KYC Verification</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {loading ? '…' : `${pagination.total} ${filter === 'all' ? 'total' : filter} submission${pagination.total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-green-500 block mb-3">verified_user</span>
          <p className="text-lg font-medium text-on-surface mb-1">All clear!</p>
          <p className="text-on-surface-variant text-sm">No {filter === 'all' ? '' : filter} KYC submissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => (
            <div key={m.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {m.full_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-0.5">
                        <p className="text-lg font-bold text-on-surface">{m.full_name}</p>
                        <StatusBadge status={m.kyc_status} />
                      </div>
                      <p className="text-sm text-on-surface-variant">{m.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Phone', value: m.phone },
                      { label: 'ID Type', value: m.id_type || '—' },
                      { label: 'ID Number', value: m.id_number_masked },
                      { label: 'Location', value: `${m.lga}, ${m.state}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-surface-container-low rounded-lg p-3">
                        <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="text-sm font-medium text-on-surface">{value}</p>
                      </div>
                    ))}
                  </div>

                  {(m.national_id_url || m.utility_bill_url) && (
                    <div className="mt-4 flex flex-wrap gap-4">
                      {m.national_id_url && (
                        <a 
                          href={m.national_id_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">badge</span>
                          National ID
                        </a>
                      )}
                      {m.utility_bill_url && (
                        <a 
                          href={m.utility_bill_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">receipt_long</span>
                          Utility Bill
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex lg:flex-col gap-3 lg:w-44 flex-shrink-0">
                  {m.kyc_status !== 'approved' && (
                    <button
                      onClick={() => openAction(m.id, m.full_name, 'approved')}
                      className="flex-1 lg:flex-none px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Approve
                    </button>
                  )}
                  {m.kyc_status !== 'rejected' && (
                    <button
                      onClick={() => openAction(m.id, m.full_name, 'rejected')}
                      className="flex-1 lg:flex-none px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">cancel</span>
                      Reject
                    </button>
                  )}
                  <a
                    href={`/admin/members/${m.id}`}
                    className="flex-1 lg:flex-none px-4 py-2.5 bg-surface-container-low hover:bg-surface-container-high rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-on-surface"
                  >
                    <span className="material-symbols-outlined text-base">person</span>
                    View Profile
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} />
      </div>

      {/* Action Modal */}
      <Modal
        title={actionModal.action === 'approved' ? 'Approve KYC' : 'Reject KYC'}
        open={actionModal.open}
        onClose={() => setActionModal((m) => ({ ...m, open: false }))}
        size="sm"
      >
        <p className="text-sm text-on-surface-variant mb-4">
          {actionModal.action === 'approved'
            ? `Approve KYC for ${actionModal.name}? This will create a virtual account.`
            : `Reject KYC for ${actionModal.name}? Please provide a reason.`}
        </p>
        {actionModal.action === 'rejected' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Rejection Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. ID document not clearly visible"
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        )}
        {actionError && <p className="text-sm text-error mb-3">{actionError}</p>}
        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
          <button onClick={() => setActionModal((m) => ({ ...m, open: false }))} className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAction}
            disabled={actionLoading || (actionModal.action === 'rejected' && !reason.trim())}
            className={`px-6 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2 ${
              actionModal.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {actionLoading && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
            Confirm
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
