'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { formatNaira } from '@/lib/formatNaira';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface Contribution {
  id: string;
  amount_kobo: number;
  status: string;
  paid_at_wat: string | null;
  paystack_reference: string;
  channel: string;
}

interface Balance {
  total_contributed: number;
  total_disbursed: number;
  contribution_count: number;
}

interface DVA {
  dva_account_number: string;
  dva_account_name: string;
  dva_bank_name: string;
  dva_bank_code: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, logout, isLoading: authLoading } = useAuth();
  const [balance, setBalance] = useState<Balance>({ total_contributed: 0, total_disbursed: 0, contribution_count: 0 });
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [dva, setDva] = useState<DVA>({ dva_account_number: '', dva_account_name: '', dva_bank_name: '', dva_bank_code: '' });
  const staticDVA = {
    account_number: '1013057526',
    account_name: '10 Stars Social Club Association',
    bank_name: 'Keystone Bank',
    bank_code: '',
    instruction: 'Transfer ₦5,000 to this account monthly. Use your banking app or dial *945*0# for USSD.',
  };
  const [copied, setCopied] = useState(false);
  const [notificationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, [user, authLoading, router]);

  const fetchDashboardData = async () => {
    if (!accessToken) return;
    
    try {
      const headers = { Authorization: `Bearer ${accessToken}`, 'Cache-Control': 'no-cache' };
      const cacheOpts: RequestInit = { headers, cache: 'no-store' };
      
      const [balanceRes, contribRes, dvaRes] = await Promise.all([
        fetch(`${API_URL}/contributions/balance`, cacheOpts),
        fetch(`${API_URL}/contributions/history`, cacheOpts),
        fetch(`${API_URL}/contributions/dva`, cacheOpts),
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance({
          total_contributed: balanceData.total_contributed_kobo || 0,
          total_disbursed: balanceData.total_disbursed_kobo || 0,
          contribution_count: balanceData.contribution_count || 0,
        });
      }

      if (contribRes.ok) {
        const contribData = await contribRes.json();
        setContributions(contribData.data || []);
      }

      if (dvaRes.ok) {
        const dvaData = await dvaRes.json();
        setDva({
          dva_account_number: dvaData.account_number || '',
          dva_account_name: dvaData.account_name || '',
          dva_bank_name: dvaData.bank_name || '',
          dva_bank_code: dvaData.bank_code || '',
        });
      } else if (dvaRes.status === 403) {
        setDva({ dva_account_number: '', dva_account_name: 'Complete KYC to get your account', dva_bank_name: '', dva_bank_code: '' });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Verified
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-error-container text-on-error-container text-[10px] font-bold rounded-full uppercase">
            <span className="material-symbols-outlined text-[14px]">error</span>
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const firstName = user.full_name?.split(' ')[0] || 'Member';

  return (
    <div className="bg-background text-on-surface">
      {/* SideNavBar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r-0 bg-slate-50 py-8 z-50">
        <div className="px-6 mb-10">
          <h1 className="text-lg font-black text-sky-950 leading-tight">The Vault</h1>
          <p className="text-xs text-on-surface-variant font-medium opacity-70">Club Member Portal</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg bg-sky-100/50 text-sky-950 border-r-4 border-sky-900 transition-all duration-300">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-semibold text-sm">Dashboard</span>
          </Link>
          <Link href="/loans" className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 hover:bg-slate-200/50 hover:pl-4 transition-all duration-300">
            <span className="material-symbols-outlined">payments</span>
            <span className="text-sm">Loans</span>
          </Link>
          <Link href="/contributions" className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 hover:bg-slate-200/50 hover:pl-4 transition-all duration-300">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="text-sm">Contributions</span>
          </Link>
          <Link href="/profile" className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 hover:bg-slate-200/50 hover:pl-4 transition-all duration-300">
            <span className="material-symbols-outlined">person</span>
            <span className="text-sm">Profile</span>
          </Link>
        </nav>
        <div className="mt-auto px-4 pt-6 space-y-1 border-t border-slate-200/50">
          <Link href="/loans" className="block w-full bg-gradient-to-r from-primary to-primary-container text-white py-3 rounded-xl font-semibold text-sm mb-6 shadow-lg shadow-sky-900/10 text-center active:scale-95 transition-all">
            Request Loan
          </Link>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/50 w-full">
            <span className="material-symbols-outlined">help</span>
            <span className="text-sm">Support</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/50">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl md:pl-64">
        <div className="flex justify-between items-center px-6 py-3 w-full">
          <div className="flex items-center gap-4">
            <span className="md:hidden text-xl font-bold tracking-tight text-sky-950">MemberVault</span>
            <h2 className="hidden md:block text-xl font-bold tracking-tight text-sky-950">Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 w-64" placeholder="Search records..." type="text"/>
            </div>
            <button className="material-symbols-outlined p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
              notifications
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
            <button className="material-symbols-outlined p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">settings</button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
              {firstName[0]}
            </div>
          </div>
        </div>
        <div className="bg-slate-200/20 h-px w-full"></div>
      </header>

      {/* Main Content */}
      <main className="md:pl-64 pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-on-surface mb-1">Welcome back, {firstName}!</h1>
            <p className="text-on-surface-variant">Here's an overview of your SIS Club account.</p>
          </div>

          {/* KYC Notification Banner */}
          {user.kyc_status !== 'approved' && (
            <div className={`mb-8 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
              user.kyc_status === 'rejected'
                ? 'bg-red-50 border-red-200'
                : user.national_id_url || user.utility_bill_url
                ? 'bg-amber-50 border-amber-200'
                : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                  user.kyc_status === 'rejected'
                    ? 'bg-red-100'
                    : user.national_id_url || user.utility_bill_url
                    ? 'bg-amber-100'
                    : 'bg-sky-100'
                }`}>
                  <span className={`material-symbols-outlined text-xl ${
                    user.kyc_status === 'rejected'
                      ? 'text-red-600'
                      : user.national_id_url || user.utility_bill_url
                      ? 'text-amber-600'
                      : 'text-sky-700'
                  }`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    {user.kyc_status === 'rejected' ? 'cancel' : user.national_id_url || user.utility_bill_url ? 'hourglass_empty' : 'verified_user'}
                  </span>
                </div>
                <div>
                  <p className={`font-bold text-sm ${
                    user.kyc_status === 'rejected' ? 'text-red-800' : user.national_id_url || user.utility_bill_url ? 'text-amber-800' : 'text-sky-900'
                  }`}>
                    {user.kyc_status === 'rejected'
                      ? 'Identity Verification Rejected'
                      : user.national_id_url || user.utility_bill_url
                      ? 'Documents Under Review'
                      : 'Verify Your Identity to Unlock All Features'}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    user.kyc_status === 'rejected' ? 'text-red-700' : user.national_id_url || user.utility_bill_url ? 'text-amber-700' : 'text-sky-700'
                  }`}>
                    {user.kyc_status === 'rejected'
                      ? `Reason: ${user.kyc_rejection_reason || 'Please re-upload clearer documents.'}`
                      : user.national_id_url || user.utility_bill_url
                      ? 'Your documents have been submitted. Admin review takes 24–48 hours.'
                      : 'Upload your National ID and a Utility Bill to get your virtual account and apply for loans.'}
                  </p>
                </div>
              </div>
              <Link
                href="/profile"
                className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  user.kyc_status === 'rejected'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : user.national_id_url || user.utility_bill_url
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-sky-700 hover:bg-sky-800 text-white'
                }`}
              >
                {user.kyc_status === 'rejected' ? 'Re-upload Documents' : user.national_id_url || user.utility_bill_url ? 'View Status' : 'Verify Now'}
              </Link>
            </div>
          )}

          {/* DVA Payment Box */}
          <div className="bg-gradient-to-br from-primary to-primary-container text-white rounded-xl p-8 mb-12 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold mb-1">Your SIS Club Account</h3>
                <p className="text-primary-fixed/80 text-sm">Transfer your monthly contribution to this account</p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-xs text-primary-fixed/60 uppercase tracking-wider mb-1">{staticDVA.bank_name}</p>
                <div className="flex items-center gap-3 justify-center md:justify-end">
                  <span className="text-3xl md:text-4xl font-mono font-black tracking-wider">{staticDVA.account_number}</span>
                  <button
                    onClick={() => copyToClipboard(staticDVA.account_number)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    {copied ? (
                      <span className="material-symbols-outlined text-green-300">check</span>
                    ) : (
                      <span className="material-symbols-outlined">content_copy</span>
                    )}
                  </button>
                </div>
                <p className="text-sm text-primary-fixed/80 mt-1">{staticDVA.account_name}</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-xs text-primary-fixed/60">
                {staticDVA.instruction}
              </p>
            </div>
          </div>

          {/* Stats Bento Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Total Savings */}
            <div className="bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl">account_balance</span>
              </div>
              <p className="text-sm font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">Total Savings</p>
              <h3 className="text-4xl font-extrabold text-green-600 mb-1">{loading ? '...' : formatNaira(balance.total_contributed)}</h3>
              <div className="flex items-center gap-2 text-xs font-medium text-green-600">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>{balance.contribution_count} contributions made</span>
              </div>
            </div>

            {/* Loan Eligibility */}
            <div className="bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden">
              <p className="text-sm font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">Loan Eligibility</p>
              <h3 className="text-3xl font-extrabold text-primary mb-1">{loading ? '...' : formatNaira(balance.total_contributed * 0.2)}</h3>
              <p className="text-sm text-on-surface-variant">20% of your savings multiplier</p>
            </div>

            {/* Net Balance */}
            <div className="bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden">
              <p className="text-sm font-semibold text-on-surface-variant mb-2 tracking-wide uppercase">Net Balance</p>
              <h3 className="text-4xl font-extrabold text-on-surface mb-1">{loading ? '...' : formatNaira(balance.total_contributed - balance.total_disbursed)}</h3>
              <p className="text-sm text-on-surface-variant">{balance.contribution_count} contributions</p>
            </div>
          </section>

          {/* Contribution History Table */}
          <section className="bg-surface-container-low rounded-xl p-1 overflow-hidden mb-8">
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-8 py-6 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-on-surface tracking-tight">Contribution History</h3>
                  <p className="text-sm text-on-surface-variant">Detailed log of your monthly membership deposits.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface text-sm font-semibold rounded-lg hover:bg-surface-container-highest transition-colors active:scale-95">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Statement
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container text-on-surface-variant">
                      <th className="px-8 py-4 text-left text-[11px] font-bold uppercase tracking-wider">Date</th>
                      <th className="px-8 py-4 text-left text-[11px] font-bold uppercase tracking-wider">Reference</th>
                      <th className="px-8 py-4 text-right text-[11px] font-bold uppercase tracking-wider">Amount</th>
                      <th className="px-8 py-4 text-center text-[11px] font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-on-surface-variant">
                          <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                        </td>
                      </tr>
                    ) : contributions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-on-surface-variant">
                          No contributions yet. Make your first deposit!
                        </td>
                      </tr>
                    ) : (
                      contributions.map((contribution, index) => (
                        <tr key={contribution.id} className={`${index % 2 === 1 ? 'bg-surface-container-low/30' : ''} hover:bg-slate-50 transition-colors`}>
                          <td className="px-8 py-6 text-sm font-medium">
                            {contribution.paid_at_wat || 'Pending'}
                          </td>
                          <td className="px-8 py-6 text-sm text-on-surface-variant font-mono">
                            {contribution.paystack_reference || 'N/A'}
                          </td>
                          <td className="px-8 py-6 text-sm font-bold text-right text-green-600">
                            {formatNaira(contribution.amount_kobo)}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-center">
                              {getStatusBadge(contribution.status)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-8 py-6 bg-surface-container-low/20 flex justify-center">
                <Link href="/contributions" className="text-sm font-semibold text-primary hover:underline transition-all">
                  View All Transactions
                </Link>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/loans" className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 hover:shadow-lg transition-shadow group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl">payments</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Apply for a Loan</h4>
                    <p className="text-sm text-on-surface-variant">Up to {loading ? '...' : formatNaira(balance.total_contributed * 0.2)} available</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </Link>
            <Link href="/contributions" className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 hover:shadow-lg transition-shadow group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-700 text-2xl">add_circle</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Make a Deposit</h4>
                    <p className="text-sm text-on-surface-variant">Add to your savings</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </Link>
          </section>
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-50/90 backdrop-blur-lg flex justify-around items-center py-3 border-t-0 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-sky-950 font-semibold">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          <span className="text-[10px]">Dashboard</span>
        </Link>
        <Link href="/loans" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">payments</span>
          <span className="text-[10px]">Loans</span>
        </Link>
        <Link href="/contributions" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span className="text-[10px]">Contributions</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px]">Profile</span>
        </Link>
      </nav>

      {/* FAB */}
      <Link href="/contributions" className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
        <span className="material-symbols-outlined">add</span>
      </Link>
    </div>
  );
}
