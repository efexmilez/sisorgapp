'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/StatusBadge';
import Modal from '@/components/admin/Modal';
import Pagination from '@/components/admin/Pagination';
import { getLoans, reviewLoan, disburseLoan } from '@/lib/adminApi';
import type { LoanRow, Pagination as PaginationMeta } from '@/lib/adminApi';

function LoansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Review modal
  const [reviewModal, setReviewModal] = useState<{
    open: boolean; loanId: string; action: 'approved' | 'rejected'; memberName: string; requestedDisplay: string;
  }>({ open: false, loanId: '', action: 'approved', memberName: '', requestedDisplay: '' });
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAmount, setReviewAmount] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Disburse modal
  const [disburseModal, setDisburseModal] = useState<{ open: boolean; loanId: string; memberName: string; amountDisplay: string }>({
    open: false, loanId: '', memberName: '', amountDisplay: '',
  });
  const [disburseLoading, setDisburseLoading] = useState(false);
  const [disburseError, setDisburseError] = useState('');

  // Toast
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/dashboard'); return; }
  }, [user, authLoading, router]);

  const fetchLoans = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      const res = await getLoans(accessToken, params);
      setLoans(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter, page]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const openReview = (loan: LoanRow, action: 'approved' | 'rejected') => {
    setReviewModal({ open: true, loanId: loan.id, action, memberName: loan.user?.full_name, requestedDisplay: loan.amount_requested_display });
    setReviewNotes('');
    setReviewAmount('');
    setReviewError('');
  };

  const handleReview = async () => {
    if (!accessToken) return;
    if (!reviewNotes.trim()) { setReviewError('Admin notes are required'); return; }
    if (reviewModal.action === 'approved' && !reviewAmount) { setReviewError('Approved amount is required'); return; }

    setReviewLoading(true);
    setReviewError('');
    try {
      const amountKobo = reviewModal.action === 'approved' ? Math.round(parseFloat(reviewAmount) * 100) : undefined;
      await reviewLoan(accessToken, reviewModal.loanId, reviewModal.action, reviewNotes, amountKobo);
      setReviewModal((m) => ({ ...m, open: false }));
      showToast(`Loan ${reviewModal.action} for ${reviewModal.memberName}`);
      fetchLoans();
    } catch (err: any) {
      setReviewError(err.message || 'Action failed');
    } finally {
      setReviewLoading(false);
    }
  };

  const openDisburse = (loan: LoanRow) => {
    setDisburseModal({ open: true, loanId: loan.id, memberName: loan.user?.full_name, amountDisplay: loan.amount_approved_display });
    setDisburseError('');
  };

  const handleDisburse = async () => {
    if (!accessToken) return;
    setDisburseLoading(true);
    setDisburseError('');
    try {
      await disburseLoan(accessToken, disburseModal.loanId);
      setDisburseModal((m) => ({ ...m, open: false }));
      showToast(`Disbursement initiated for ${disburseModal.memberName}`);
      fetchLoans();
    } catch (err: any) {
      setDisburseError(err.message || 'Disbursement failed');
    } finally {
      setDisburseLoading(false);
    }
  };

  const filtered = loans.filter(
    (l) => l.user?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'disbursed', label: 'Disbursed' },
    { value: 'awaiting_transfer', label: 'Awaiting Transfer' },
    { value: 'rejected', label: 'Rejected' },
  ];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <AdminLayout>
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Loan Applications</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{loading ? '…' : `${pagination.total} total`}</p>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            type="text"
            placeholder="Search member name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 text-on-surface"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
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

      {/* Loan cards */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">account_balance</span>
          <p className="text-on-surface-variant">No loan applications found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((loan) => (
            <div key={loan.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1">
                  {/* Member header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold flex-shrink-0 shadow-inner">
                      {loan.user?.full_name?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{loan.user?.full_name}</p>
                      <p className="text-xs text-on-surface-variant">{loan.user?.phone} · Applied {loan.applied_at}</p>
                    </div>
                  </div>

                  {/* Amounts grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">Requested</p>
                      <p className="font-bold text-primary">{loan.amount_requested_display}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">Approved</p>
                      <p className="font-bold text-on-surface">{loan.amount_approved_display}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">Total Repayment</p>
                      <p className="font-medium text-on-surface">{loan.total_repayment_display}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">Member Savings</p>
                      <p className="font-medium text-secondary">{loan.member_total_savings_display}</p>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Purpose</p>
                    <p className="text-sm text-on-surface">{loan.purpose}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col items-start gap-3 flex-wrap lg:flex-nowrap lg:w-44 flex-shrink-0">
                  <StatusBadge status={loan.status} />
                  <div className="flex lg:flex-col gap-2 flex-wrap w-full mt-2">
                    {loan.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openReview(loan, 'approved')}
                          className="flex-1 lg:w-full px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">check</span>
                          Approve
                        </button>
                        <button
                          onClick={() => openReview(loan, 'rejected')}
                          className="flex-1 lg:w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                          Reject
                        </button>
                      </>
                    )}
                    {loan.status === 'approved' && (
                      <button
                        onClick={() => openDisburse(loan)}
                        className="flex-1 lg:w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-base">send_money</span>
                        Disburse
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPage={setPage} />
      </div>

      {/* Review Modal */}
      <Modal
        title={reviewModal.action === 'approved' ? 'Approve Loan' : 'Reject Loan'}
        open={reviewModal.open}
        onClose={() => setReviewModal((m) => ({ ...m, open: false }))}
        size="md"
      >
        <p className="text-sm text-on-surface-variant mb-4">
          {reviewModal.action === 'approved'
            ? `Approving loan for ${reviewModal.memberName} (requested ${reviewModal.requestedDisplay})`
            : `Rejecting loan for ${reviewModal.memberName}`}
        </p>

        {reviewModal.action === 'approved' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Approved Amount (NGN) *</label>
            <input
              type="number"
              value={reviewAmount}
              onChange={(e) => setReviewAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
            />
            <p className="text-xs text-on-surface-variant mt-1">Enter amount in Naira (not kobo)</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Admin Notes *</label>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={3}
            placeholder={reviewModal.action === 'approved' ? 'e.g. Approved — good repayment history' : 'e.g. Insufficient savings balance'}
            className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-on-surface"
          />
        </div>

        {reviewError && <p className="text-sm text-error mb-3">{reviewError}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
          <button onClick={() => setReviewModal((m) => ({ ...m, open: false }))} className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleReview}
            disabled={reviewLoading}
            className={`px-6 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm ${
              reviewModal.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {reviewLoading && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
            {reviewModal.action === 'approved' ? 'Approve Loan' : 'Reject Loan'}
          </button>
        </div>
      </Modal>

      {/* Disburse Modal */}
      <Modal
        title="Disburse Loan"
        open={disburseModal.open}
        onClose={() => setDisburseModal((m) => ({ ...m, open: false }))}
        size="sm"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 text-xl flex-shrink-0">warning</span>
            <div>
              <p className="text-sm font-medium text-amber-800">Confirm Disbursement</p>
              <p className="text-sm text-amber-700 mt-0.5">
                This will initiate a transfer of <strong>{disburseModal.amountDisplay}</strong> to {disburseModal.memberName} via Paystack. This cannot be undone.
              </p>
            </div>
          </div>
        </div>
        {disburseError && <p className="text-sm text-error mb-3">{disburseError}</p>}
        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
          <button onClick={() => setDisburseModal((m) => ({ ...m, open: false }))} className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDisburse}
            disabled={disburseLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            {disburseLoading && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
            Confirm Disbursement
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default function AdminLoans() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    }>
      <LoansContent />
    </Suspense>
  );
}
