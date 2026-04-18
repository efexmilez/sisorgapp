'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/StatusBadge';
import Modal from '@/components/admin/Modal';
import { getUserDetail, editUser, reviewKyc } from '@/lib/adminApi';
import type { UserDetail } from '@/lib/adminApi';

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;
  const { user, accessToken, isLoading } = useAuth();

  const [member, setMember] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserDetail>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // KYC modal
  const [kycOpen, setKycOpen] = useState(false);
  const [kycAction, setKycAction] = useState<'approved' | 'rejected'>('approved');
  const [kycReason, setKycReason] = useState('');
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState('');

  // Toast
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/dashboard'); return; }
    fetchMember();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, memberId]);

  const fetchMember = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getUserDetail(accessToken, memberId);
      setMember(data);
      setEditForm({
        full_name: data.full_name,
        phone: data.phone,
        state: data.state,
        lga: data.lga,
        street_address: data.street_address,
        area: data.area,
        role: data.role as any,
        bank_account_number: data.bank_account_number,
        bvn: data.bvn,
        bank_name: data.bank_name,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load member');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!accessToken || !member) return;
    setEditLoading(true);
    setEditError('');
    try {
      await editUser(accessToken, memberId, editForm);
      await fetchMember();
      setEditOpen(false);
      showToast('Member updated successfully');
    } catch (err: any) {
      setEditError(err.message || 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };

  const handleKyc = async () => {
    if (!accessToken) return;
    setKycLoading(true);
    setKycError('');
    try {
      await reviewKyc(accessToken, memberId, kycAction, kycReason);
      await fetchMember();
      setKycOpen(false);
      setKycReason('');
      showToast(`KYC ${kycAction} successfully`);
    } catch (err: any) {
      setKycError(err.message || 'KYC action failed');
    } finally {
      setKycLoading(false);
    }
  };

  const openKyc = (action: 'approved' | 'rejected') => {
    setKycAction(action);
    setKycReason('');
    setKycError('');
    setKycOpen(true);
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;
  }

  return (
    <AdminLayout>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Back */}
      <div className="mb-6">
        <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Members
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      ) : error || !member ? (
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <p className="text-error font-medium">{error || 'Member not found'}</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {member.full_name?.[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold font-headline text-on-surface">{member.full_name}</h1>
                <p className="text-on-surface-variant text-sm">{member.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={member.kyc_status} />
                  <span className="text-xs text-on-surface-variant">Member since {member.created_at}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit Member
              </button>
              {member.kyc_status !== 'approved' && (
                <button
                  onClick={() => openKyc('approved')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Approve KYC
                </button>
              )}
              {member.kyc_status !== 'rejected' && (
                <button
                  onClick={() => openKyc('rejected')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">cancel</span>
                  Reject KYC
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Info */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
                <h2 className="font-bold text-on-surface mb-4">Personal Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', value: member.full_name },
                    { label: 'Email', value: member.email },
                    { label: 'Phone', value: member.phone },
                    { label: 'Role', value: member.role },
                    { label: 'State', value: member.state },
                    { label: 'LGA', value: member.lga },
                    { label: 'Street Address', value: member.street_address || '—' },
                    { label: 'Area', value: member.area || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-on-surface break-all">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* KYC */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
                <h2 className="font-bold text-on-surface mb-4">KYC Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">ID Type</p>
                      <p className="text-sm font-medium text-on-surface">{member.id_type || '—'}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">ID Number</p>
                      <p className="text-sm font-medium font-mono text-on-surface">{member.id_number_masked}</p>
                    </div>
                  </div>
                  {member.kyc_status === 'rejected' && member.kyc_rejection_reason && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-red-700 mb-0.5">Rejection Reason</p>
                      <p className="text-sm text-red-600">{member.kyc_rejection_reason}</p>
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-2">Documents</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* National ID */}
                      {member.national_id_url ? (
                        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-primary">badge</span>
                            <span className="text-sm font-semibold">National ID</span>
                          </div>
                          <a 
                            href={member.national_id_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            View Document
                          </a>
                        </div>
                      ) : (
                        <div className="bg-surface-container-low/50 p-4 rounded-xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center py-6">
                           <span className="material-symbols-outlined text-outline text-xl mb-1">badge</span>
                           <span className="text-xs text-on-surface-variant italic">No National ID</span>
                        </div>
                      )}

                      {/* Utility Bill */}
                      {member.utility_bill_url ? (
                        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-primary">receipt_long</span>
                            <span className="text-sm font-semibold">Utility Bill</span>
                          </div>
                          <a 
                            href={member.utility_bill_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            View Document
                          </a>
                        </div>
                      ) : (
                        <div className="bg-surface-container-low/50 p-4 rounded-xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center py-6">
                           <span className="material-symbols-outlined text-outline text-xl mb-1">receipt_long</span>
                           <span className="text-xs text-on-surface-variant italic">No Utility Bill</span>
                        </div>
                      )}
                    </div>

                    {/* Legacy doc url */}
                    {member.id_doc_url && !member.national_id_url && (
                      <div className="pt-2">
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-2 opacity-70 italic">Legacy Document</p>
                        <a
                          href={member.id_doc_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-base">open_in_new</span>
                          View Original ID Document
                        </a>
                      </div>
                    )}
                  </div>
              </div>

              {/* Bank Details */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
                <h2 className="font-bold text-on-surface mb-4">Bank Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Bank Name', value: member.bank_name || '—' },
                    { label: 'Account Number', value: member.bank_account_number || '—' },
                    { label: 'BVN', value: member.bvn || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-container-low rounded-lg p-3">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-sm font-medium font-mono text-on-surface">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Loans */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
                  <h2 className="font-bold text-on-surface">Recent Loans</h2>
                  <Link href={`/admin/loans`} className="text-xs text-primary hover:underline">View all loans</Link>
                </div>
                {member.recent_loans.length === 0 ? (
                  <p className="p-6 text-sm text-on-surface-variant">No loans yet</p>
                ) : (
                  <div className="divide-y divide-outline-variant/10">
                    {member.recent_loans.map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="text-sm font-medium text-on-surface">{l.amount_requested_display}</p>
                          <p className="text-xs text-on-surface-variant">{l.purpose?.slice(0, 50)}… · {l.applied_at}</p>
                        </div>
                        <StatusBadge status={l.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Balance */}
              <div className="bg-gradient-to-br from-primary to-primary-container rounded-xl p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wider opacity-75 mb-1">Total Contributed</p>
                <p className="text-2xl font-bold font-headline mb-4">{member.balance.total_contributed_display}</p>
                <div className="space-y-2 pt-4 border-t border-white/20">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">Disbursed</span>
                    <span className="font-medium">{member.balance.total_disbursed_display}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-70">Net Balance</span>
                    <span className="font-bold">{member.balance.net_display}</span>
                  </div>
                </div>
              </div>

              {/* DVA */}
              {member.dva ? (
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5">
                  <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
                    Virtual Account
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-on-surface-variant">Account Number</p>
                      <p className="text-sm font-bold font-mono text-on-surface">{member.dva.account_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Account Name</p>
                      <p className="text-sm font-medium text-on-surface">{member.dva.account_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Bank</p>
                      <p className="text-sm font-medium text-on-surface">{member.dva.bank_name}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5">
                  <p className="text-sm text-on-surface-variant text-center">No virtual account yet</p>
                </div>
              )}

              {/* Recent Deposits */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant/10">
                  <h3 className="font-bold text-on-surface">Recent Deposits</h3>
                </div>
                {member.recent_contributions.length === 0 ? (
                  <p className="p-5 text-sm text-on-surface-variant">No deposits yet</p>
                ) : (
                  <div className="divide-y divide-outline-variant/10">
                    {member.recent_contributions.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-on-surface">{c.amount_display}</p>
                          <p className="text-xs text-on-surface-variant">{c.paid_at || c.created_at}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      <Modal title="Edit Member" open={editOpen} onClose={() => setEditOpen(false)} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'full_name', label: 'Full Name', type: 'text' },
            { key: 'phone', label: 'Phone', type: 'tel' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'lga', label: 'LGA', type: 'text' },
            { key: 'street_address', label: 'Street Address', type: 'text' },
            { key: 'area', label: 'Area', type: 'text' },
            { key: 'bank_name', label: 'Bank Name', type: 'text' },
            { key: 'bank_account_number', label: 'Account Number', type: 'text' },
            { key: 'bvn', label: 'BVN', type: 'text' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">{label}</label>
              <input
                type={type}
                value={(editForm as any)[key] ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Role</label>
            <select
              value={(editForm as any).role ?? 'member'}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as any }))}
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        {editError && <p className="mt-3 text-sm text-error">{editError}</p>}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/10">
          <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleEdit}
            disabled={editLoading}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {editLoading && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
            Save Changes
          </button>
        </div>
      </Modal>

      {/* KYC Modal */}
      <Modal title={kycAction === 'approved' ? 'Approve KYC' : 'Reject KYC'} open={kycOpen} onClose={() => setKycOpen(false)} size="sm">
        <p className="text-sm text-on-surface-variant mb-4">
          {kycAction === 'approved'
            ? 'This will approve the KYC and create a Paystack DVA for the member.'
            : 'This will reject the KYC. Please provide a reason.'}
        </p>
        {kycAction === 'rejected' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Rejection Reason *</label>
            <textarea
              value={kycReason}
              onChange={(e) => setKycReason(e.target.value)}
              rows={3}
              placeholder="e.g. ID document is blurry or unreadable"
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        )}
        {kycError && <p className="text-sm text-error mb-3">{kycError}</p>}
        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
          <button onClick={() => setKycOpen(false)} className="px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleKyc}
            disabled={kycLoading || (kycAction === 'rejected' && !kycReason.trim())}
            className={`px-6 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2 ${
              kycAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {kycLoading && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
            {kycAction === 'approved' ? 'Approve KYC' : 'Reject KYC'}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
