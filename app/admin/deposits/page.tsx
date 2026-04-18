'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/StatusBadge';
import Modal from '@/components/admin/Modal';
import Pagination from '@/components/admin/Pagination';
import { getContributions, approveContribution, rejectContribution } from '@/lib/adminApi';
import type { ContributionRow, Pagination as PaginationMeta } from '@/lib/adminApi';

export default function AdminDeposits() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();

  const [deposits, setDeposits] = useState<ContributionRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Action modal
  const [modal, setModal] = useState<{
    open: boolean;
    depositId: string;
    action: 'approve' | 'reject';
    memberName: string;
    amount: string;
  }>({ open: false, depositId: '', action: 'approve', memberName: '', amount: '' });
  const [rejectReason, setRejectReason] = useState('');
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

  const fetchDeposits = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      const res = await getContributions(accessToken, params);
      setDeposits(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter, page]);

  useEffect(() => { fetchDeposits(); }, [fetchDeposits]);

  const openModal = (deposit: ContributionRow, action: 'approve' | 'reject') => {
    setModal({ open: true, depositId: deposit.id, action, memberName: deposit.user?.full_name, amount: deposit.amount_display });
    setRejectReason('');
    setActionError('');
  };

  const handleAction = async () => {
    if (!accessToken) return;
    setActionLoading(true);
    setActionError('');
    try {
      if (modal.action === 'approve') {
        await approveContribution(accessToken, modal.depositId);
        showToast(`Deposit approved for ${modal.memberName}`);
      } else {
        if (!rejectReason.trim()) { setActionError('Reason is required'); return; }
        await rejectContribution(accessToken, modal.depositId, rejectReason);
        showToast(`Deposit rejected for ${modal.memberName}`);
      }
      setModal((m) => ({ ...m, open: false }));
      fetchDeposits();
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = deposits.filter(
    (d) =>
      d.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      (d.paystack_reference || '').toLowerCase().includes(search.toLowerCase())
  );

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
  ];

  // Stats
  const totalPending = deposits.filter((d) => d.status === 'pending').length;
  const totalSuccess = deposits.filter((d) => d.status === 'success').length;
  const totalValue = deposits
    .filter((d) => d.status === 'success')
    .reduce((sum, d) => sum + d.amount_kobo, 0);
  const formatNaira = (kobo: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(kobo / 100);

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
          <h1 className="text-3xl font-bold font-headline text-primary">Deposit Management</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{loading ? '…' : `${pagination.total} total deposits`}</p>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            type="text"
            placeholder="Search name, email, ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-1">Pending Review</p>
          <p className="text-3xl font-bold font-headline text-amber-800">{totalPending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">Confirmed Deposits</p>
          <p className="text-3xl font-bold font-headline text-green-800">{totalSuccess}</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">Total Confirmed Value</p>
          <p className="text-2xl font-bold font-headline text-primary">{formatNaira(totalValue)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Member</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Reference</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">Channel</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">payments</span>
                    <p className="text-on-surface-variant">No deposits found</p>
                  </td>
                </tr>
              ) : filtered.map((d) => (
                <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-on-surface">{d.user?.full_name}</p>
                      <p className="text-xs text-on-surface-variant">{d.user?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-primary">{d.amount_display}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-xs font-mono text-on-surface-variant">{d.paystack_reference || '—'}</p>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <p className="text-sm text-on-surface-variant capitalize">{d.channel || '—'}</p>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="text-sm text-on-surface-variant">{d.paid_at || d.created_at}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-6 py-4">
                    {d.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(d, 'approve')}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                          Approve
                        </button>
                        <button
                          onClick={() => openModal(d, 'reject')}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <Link
                        href={`/admin/members/${d.user_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container-high rounded-lg text-xs font-medium text-on-surface transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">person</span>
                        Profile
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-4">
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} />
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        title={modal.action === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        size="sm"
      >
        <p className="text-sm text-on-surface-variant mb-4">
          {modal.action === 'approve'
            ? `Manually approve ${modal.amount} deposit for ${modal.memberName}? This will credit their contribution balance.`
            : `Reject ${modal.amount} deposit for ${modal.memberName}? Please provide a reason.`}
        </p>
        {modal.action === 'reject' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Payment reference not matched"
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        )}
        {actionError && <p className="text-sm text-error mb-3">{actionError}</p>}
        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
          <button onClick={() => setModal((m) => ({ ...m, open: false }))} className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAction}
            disabled={actionLoading || (modal.action === 'reject' && !rejectReason.trim())}
            className={`px-6 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2 ${
              modal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {actionLoading && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
            {modal.action === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
