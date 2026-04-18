'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/StatusBadge';
import { getLiquidity, getUsers, getLoans, getContributions } from '@/lib/adminApi';
import type { LiquidityData, UserRow, LoanRow, ContributionRow } from '@/lib/adminApi';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [liquidity, setLiquidity] = useState<LiquidityData | null>(null);
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([]);
  const [recentLoans, setRecentLoans] = useState<LoanRow[]>([]);
  const [recentDeposits, setRecentDeposits] = useState<ContributionRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/dashboard'); return; }
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  const loadAll = async () => {
    if (!accessToken) {
      console.warn('Admin loadAll: No accessToken found');
      return;
    }
    
    setFetching(true);


    const fetchTask = async <T,>(promise: Promise<T>, label: string): Promise<T | null> => {
      try {
        return await promise;
      } catch (err) {
        console.error(`Admin: ${label} fetch failed:`, err);
        return null;
      }
    };

    try {
      const [liq, users, loans, deposits] = await Promise.all([
        fetchTask(getLiquidity(accessToken), 'Liquidity'),
        fetchTask(getUsers(accessToken, { limit: 5 }), 'Users'),
        fetchTask(getLoans(accessToken, { limit: 5 }), 'Loans'),
        fetchTask(getContributions(accessToken, { limit: 5 }), 'Contributions'),
      ]);

      if (liq) setLiquidity(liq);
      if (users) setRecentUsers(users.data);
      if (loans) setRecentLoans(loans.data);
      if (deposits) setRecentDeposits(deposits.data);
      

    } catch (err) {
      console.error('Admin: Critical dashboard load error:', err);
    } finally {
      setFetching(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary mb-1">Dashboard Overview</h1>
        <p className="text-sm text-on-surface-variant">Welcome back, {user.full_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Members', value: liquidity?.total_users ?? 0, color: 'text-primary' },
          { label: 'KYC Pending', value: liquidity?.kyc_pending ?? 0, color: 'text-green-600' },
          { label: 'Pending Loans', value: liquidity?.pending_loans ?? 0, color: 'text-amber-600' },
          { label: 'Active Loans', value: liquidity?.active_loans ?? 0, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
            <p className={`text-3xl font-bold font-headline ${color}`}>{fetching ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Financial Overview + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-primary-container rounded-xl p-6 text-white">
          <p className="text-xs font-medium uppercase tracking-wider opacity-75 mb-1">Total Contributions Pool</p>
          <p className="text-4xl font-bold font-headline mb-6">
            {fetching ? '—' : liquidity?.total_contributed_display}
          </p>
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/20">
            <div>
              <p className="text-xs opacity-60 mb-1">Total Disbursed</p>
              <p className="text-xl font-bold">{fetching ? '—' : liquidity?.total_disbursed_display}</p>
            </div>
            <div>
              <p className="text-xs opacity-60 mb-1">Available Pool</p>
              <p className="text-xl font-bold">{fetching ? '—' : liquidity?.available_display}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-4">Quick Actions</p>
          <div className="space-y-2">
            <Link href="/admin/loans" className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
              <span className="material-symbols-outlined text-amber-600 text-xl">pending_actions</span>
              <span className="text-sm font-medium text-amber-800">
                Review Loans ({fetching ? '…' : liquidity?.pending_loans})
              </span>
            </Link>
            <Link href="/admin/kyc" className="flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
              <span className="text-sm font-medium text-on-surface">Verify KYC</span>
            </Link>
            <Link href="/admin/deposits" className="flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary text-xl">payments</span>
              <span className="text-sm font-medium text-on-surface">Manage Deposits</span>
            </Link>
            <Link href="/admin/members" className="flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary text-xl">group</span>
              <span className="text-sm font-medium text-on-surface">Manage Members</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Members + Recent Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
            <h2 className="font-bold text-on-surface">Recent Members</h2>
            <Link href="/admin/members" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {fetching ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              </div>
            ) : recentUsers.length === 0 ? (
              <p className="p-6 text-sm text-on-surface-variant text-center">No members yet</p>
            ) : recentUsers.map((m) => (
              <Link key={m.id} href={`/admin/members/${m.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {m.full_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{m.full_name}</p>
                    <p className="text-xs text-on-surface-variant truncate">{m.email}</p>
                  </div>
                </div>
                <StatusBadge status={m.kyc_status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
            <h2 className="font-bold text-on-surface">Recent Loans</h2>
            <Link href="/admin/loans" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {fetching ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
              </div>
            ) : recentLoans.length === 0 ? (
              <p className="p-6 text-sm text-on-surface-variant text-center">No loans yet</p>
            ) : recentLoans.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-on-surface">{l.user?.full_name}</p>
                  <p className="text-xs text-on-surface-variant">{l.amount_requested_display} · {l.applied_at}</p>
                </div>
                <StatusBadge status={l.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Deposits table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-bold text-on-surface">Recent Deposits</h2>
          <Link href="/admin/deposits" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low">
                {['Member', 'Amount', 'Channel', 'Date', 'Status'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {fetching ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                  </td>
                </tr>
              ) : recentDeposits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-on-surface-variant">No deposits yet</td>
                </tr>
              ) : recentDeposits.map((d) => (
                <tr key={d.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-3 text-sm text-on-surface">{d.user?.full_name}</td>
                  <td className="px-6 py-3 text-sm font-medium text-primary">{d.amount_display}</td>
                  <td className="px-6 py-3 text-sm text-on-surface-variant capitalize">{d.channel || '—'}</td>
                  <td className="px-6 py-3 text-sm text-on-surface-variant">{d.paid_at || d.created_at}</td>
                  <td className="px-6 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
