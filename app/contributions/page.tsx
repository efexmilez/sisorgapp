'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { useRef } from 'react';
import {
  mockBalance,
  mockDVA,
  formatNaira,
  Contribution,
} from '@/lib/store';

const PaystackPayment = dynamic(() => import('@/components/PaystackPayment'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

export default function ContributionsPage() {
  const router = useRouter();
  const { user, accessToken, logout, isLoading: authLoading } = useAuth();
  const [balance, setBalance] = useState({
    ...mockBalance,
    total_contributed_kobo: 0,
    this_month_contribution_kobo: 0,
    contribution_count: 0
  });
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [dva, setDva] = useState(mockDVA);
  const staticDVA = {
    account_number: '1013057526',
    account_name: '10 Stars Social Club Association',
    bank_name: 'Keystone Bank',
    bank_code: '',
    instruction: 'Transfer ₦5,000 to this account monthly. Use your banking app or dial *945*0# for USSD.',
  };
  
  // Form state
  const [amount, setAmount] = useState('5000');
  const [paymentMethod, setPaymentMethod] = useState('Debit/Credit Card');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user, authLoading, router, mounted]);

  const fetchData = async () => {
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
        const data = await balanceRes.json();
        setBalance({
          total_contributed_kobo: data.total_contributed_kobo || 0,
          total_disbursed_kobo: data.total_disbursed_kobo || 0,
          net_balance_kobo: (data.total_contributed_kobo || 0) - (data.total_disbursed_kobo || 0),
          max_loan_amount_kobo: data.max_loan_amount_kobo || (data.total_contributed_kobo || 0) * 2,
          contribution_count: data.contribution_count || 0,
          this_month_contribution_kobo: data.this_month_contribution_kobo || 0,
        });
      }

      if (contribRes.ok) {
        const data = await contribRes.json();
        if (data.data && data.data.length > 0) {
          setContributions(data.data.map((c: any) => ({
            id: c.id,
            amount_kobo: c.amount_kobo,
            amount_display: c.amount_display,
            status: c.status,
            paid_at_wat: c.paid_at_wat || 'Pending',
            paid_at_iso: c.paid_at_iso || '',
            paystack_reference: c.paystack_reference || 'N/A',
            channel: c.channel || 'dedicated_account',
          })));
        }
      }

      if (dvaRes.ok) {
        const data = await dvaRes.json();
        setDva({
          account_number: data.account_number || '',
          account_name: data.account_name || user?.full_name || 'Your Name',
          bank_name: data.bank_name || 'Wema Bank',
          bank_code: data.bank_code || '035',
          instruction: data.instruction || 'Transfer ₦5,000 to this account monthly. Use your banking app or dial *945*0# for USSD.',
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

  const paystackInitRef = useRef<((onSuccess: any, onClose: any) => void) | null>(null);

  const onSuccess = async (reference: any) => {
    // This is called when payment is successful
    setSuccessMessage(`Payment successful! Reference: ${reference.reference}`);
    try {
      await fetch(`${API_URL}/contributions/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reference: reference.reference }),
      });
    } catch (e) {
      console.error('Verify error:', e);
    }
    fetchData(); // Refresh history and balances
  };

  const onClose = () => {
    setSubmitting(false);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    
    if (paymentMethod === 'Debit/Credit Card') {
      setSubmitting(true);
      if (paystackInitRef.current) {
        paystackInitRef.current(onSuccess, onClose);
      } else {
        alert('Payment system is still loading. Please try again in a moment.');
        setSubmitting(false);
      }
    } else {
      setSubmitting(true);
      const amountKobo = Math.round(parseFloat(amount) * 100);

      try {
        const response = await fetch(`${API_URL}/contributions/initiate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ amount_kobo: amountKobo }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to initiate payment');
        }

        const data = await response.json();
        setSuccessMessage(`Transfer initiated! Please transfer ${formatNaira(amountKobo)} to your virtual account with reference: ${data.reference}`);
      } catch (error: any) {
        setSuccessMessage(`Error: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase">Verified</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">Failed</span>;
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

  return (
    <div className="bg-background text-on-surface">
      {/* SideNavBar — desktop only; mobile uses bottom nav */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r-0 bg-slate-50 py-8 z-50">
        <div className="px-6 mb-10">
          <h1 className="text-lg font-black text-sky-950 leading-tight">The Vault</h1>
          <p className="text-xs text-on-surface-variant font-medium opacity-70">Club Member Portal</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 hover:bg-slate-200/50 hover:pl-4 transition-all duration-300">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-sm">Dashboard</span>
          </Link>
          <Link href="/loans" className="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 hover:bg-slate-200/50 hover:pl-4 transition-all duration-300">
            <span className="material-symbols-outlined">payments</span>
            <span className="text-sm">Loans</span>
          </Link>
          <Link href="/contributions" className="flex items-center gap-3 px-3 py-3 rounded-lg bg-sky-100/50 text-sky-950 border-r-4 border-sky-900 transition-all duration-300">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="font-semibold text-sm">Contributions</span>
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
          <button type="button" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/50 w-full">
            <span className="material-symbols-outlined">help</span>
            <span className="text-sm">Support</span>
          </button>
          <button type="button" onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/50 w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl md:pl-64 border-b border-slate-200/30">
        <div className="flex justify-between items-center gap-3 px-4 sm:px-6 py-3 w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="md:hidden text-base font-bold tracking-tight text-sky-950 truncate">Contributions</span>
            <h2 className="hidden md:block text-xl font-bold tracking-tight text-sky-950">Your Contributions</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button type="button" className="material-symbols-outlined text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors hidden sm:inline-flex" aria-label="Notifications">notifications</button>
            <button type="button" className="material-symbols-outlined text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors" aria-label="Help">help</button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user.full_name?.[0] || 'M'}
            </div>
          </div>
        </div>
      </header>

      <main className="md:pl-64 pt-16 min-h-screen pb-24 md:pb-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-manrope text-primary tracking-tight">Your Contributions</h2>
            <p className="text-on-surface-variant mt-2 text-sm sm:text-base md:text-lg max-w-2xl">Track your savings and collective growth within the club.</p>
          </div>

          {/* DVA Account Card */}
          <div className="bg-gradient-to-r from-primary to-primary-container text-white rounded-xl p-4 sm:p-8 mb-6 sm:mb-10 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold mb-1">Your SIS Club Account</h3>
                <p className="text-primary-fixed/80 text-xs sm:text-sm">Transfer your monthly contribution to this dedicated account</p>
              </div>
              <div className="text-left md:text-right min-w-0 w-full md:w-auto">
                <p className="text-xs text-primary-fixed/60 uppercase tracking-wider mb-1">{staticDVA.bank_name}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:justify-end">
                  <span className="text-xl sm:text-2xl md:text-3xl font-mono font-black tracking-wider break-all">{staticDVA.account_number}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(staticDVA.account_number)}
                    className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors shrink-0"
                    aria-label="Copy account number"
                  >
                    {copied ? (
                      <span className="material-symbols-outlined text-green-300">check</span>
                    ) : (
                      <span className="material-symbols-outlined">content_copy</span>
                    )}
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-primary-fixed/80 mt-1 break-words">{staticDVA.account_name}</p>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/20">
              <p className="text-xs text-primary-fixed/60 leading-relaxed">
                {staticDVA.instruction}
              </p>
            </div>
          </div>

          {/* Bento Grid Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div className="bg-surface-container-lowest p-5 sm:p-8 rounded-xl flex flex-col justify-between min-h-[10rem] md:h-48 group hover:shadow-lg transition-shadow">
              <div className="min-w-0">
                <span className="label-md uppercase tracking-widest text-on-surface-variant font-semibold text-[10px] sm:text-xs">Total Lifetime Contributions</span>
                <div className="mt-3 sm:mt-4 flex items-baseline flex-wrap gap-x-1">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-manrope text-primary break-words">{formatNaira(balance.total_contributed_kobo)}</span>
                </div>
              </div>
              <div className="flex items-center text-xs text-green-600 font-medium mt-3">
                <span className="material-symbols-outlined text-sm mr-1 shrink-0">trending_up</span>
                +12% from last year
              </div>
            </div>

            <div className="bg-surface-container-lowest p-5 sm:p-8 rounded-xl flex flex-col justify-between min-h-[10rem] md:h-48 border border-transparent hover:border-outline-variant/20 transition-all">
              <div className="min-w-0">
                <span className="label-md uppercase tracking-widest text-on-surface-variant font-semibold text-[10px] sm:text-xs">This Month&apos;s Deposit</span>
                <div className="mt-3 sm:mt-4 flex items-baseline">
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold font-manrope text-on-surface break-words">{formatNaira(balance.this_month_contribution_kobo)}</span>
                </div>
              </div>
              <div className="flex items-center mt-3">
                <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full tracking-wider uppercase">Due: 25th</span>
              </div>
            </div>

            <div className="bg-primary-container p-5 sm:p-8 rounded-xl flex flex-col justify-between min-h-[10rem] md:h-48 text-on-primary-container shadow-lg shadow-primary/10">
              <div>
                <span className="label-md uppercase tracking-widest opacity-70 font-semibold text-[10px] sm:text-xs">Total Contributions</span>
                <div className="mt-3 sm:mt-4">
                  <span className="text-xl sm:text-2xl font-bold font-manrope">{balance.contribution_count}</span>
                  <span className="text-sm ml-2 opacity-70">months</span>
                </div>
              </div>
              <div className="flex items-center text-xs font-medium mt-3">
                <span className="material-symbols-outlined text-sm mr-1 shrink-0">event_repeat</span>
                Autopay Active
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Transaction History */}
            <div className="lg:col-span-8 space-y-4 sm:space-y-6 order-2 lg:order-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-lg sm:text-xl font-bold font-manrope text-primary">Transaction History</h3>
                <span className="hidden md:inline text-on-surface-variant text-xs sm:text-sm">Scroll horizontally if needed</span>
              </div>

              {/* Mobile: card list */}
              <div className="md:hidden space-y-3">
                {contributions.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-xl p-6 text-center text-sm text-on-surface-variant border border-outline-variant/10">
                    No transactions yet. Make your first deposit below.
                  </div>
                ) : (
                  contributions.map((contribution) => (
                    <div
                      key={contribution.id}
                      className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <span className="text-sm font-medium text-on-surface">{contribution.paid_at_wat}</span>
                        {getStatusBadge(contribution.status)}
                      </div>
                      <p className="text-xs text-on-surface-variant mb-1">Monthly Savings</p>
                      <p className="text-xs font-mono text-on-surface-variant break-all mb-2">{contribution.paystack_reference}</p>
                      <p className="text-base font-bold text-green-600">{formatNaira(contribution.amount_kobo)}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-surface-container-low">
                        <th className="px-4 lg:px-6 py-4 label-md uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Date</th>
                        <th className="px-4 lg:px-6 py-4 label-md uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Description</th>
                        <th className="px-4 lg:px-6 py-4 label-md uppercase tracking-wider text-[10px] font-bold text-on-surface-variant">Reference</th>
                        <th className="px-4 lg:px-6 py-4 label-md uppercase tracking-wider text-[10px] font-bold text-on-surface-variant text-right">Amount</th>
                        <th className="px-4 lg:px-6 py-4 label-md uppercase tracking-wider text-[10px] font-bold text-on-surface-variant text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-sm text-on-surface-variant">
                            No transactions yet. Make your first deposit using the form.
                          </td>
                        </tr>
                      ) : (
                        contributions.map((contribution, index) => (
                          <tr key={contribution.id} className={`${index % 2 === 1 ? 'bg-surface-container-low/30' : ''} hover:bg-surface-container-low transition-colors`}>
                            <td className="px-4 lg:px-6 py-5 text-sm font-medium text-on-surface whitespace-nowrap">{contribution.paid_at_wat}</td>
                            <td className="px-4 lg:px-6 py-5 text-sm text-on-surface-variant">Monthly Savings</td>
                            <td className="px-4 lg:px-6 py-5 text-sm font-mono text-outline max-w-[12rem] truncate" title={contribution.paystack_reference}>{contribution.paystack_reference}</td>
                            <td className="px-4 lg:px-6 py-5 text-sm font-bold text-right text-green-600 whitespace-nowrap">{formatNaira(contribution.amount_kobo)}</td>
                            <td className="px-4 lg:px-6 py-5 text-center">{getStatusBadge(contribution.status)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* New Contribution Form — first on mobile for primary action */}
            <div className="lg:col-span-4 order-1 lg:order-2">
              <div id="new-contribution" className="bg-surface-container-low rounded-xl p-5 sm:p-8 lg:sticky lg:top-24">
                <h3 className="text-xl font-bold font-manrope text-primary mb-6">New Contribution</h3>
                
                {successMessage && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      <p className="text-sm text-green-800 break-words">{successMessage}</p>
                    </div>
                  </div>
                )}

                {/* Paystack Logic (Client Side Only) */}
                <PaystackPayment 
                  amount={amount}
                  user={user}
                  paystackKey={PAYSTACK_PUBLIC_KEY}
                  onSuccess={onSuccess}
                  onClose={onClose}
                  initializeRef={paystackInitRef}
                />

                <form onSubmit={handleSubmitDeposit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Amount (₦)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">₦</span>
                      <input
                        className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-on-surface font-semibold transition-all"
                        placeholder="0.00"
                        type="number"
                        min={5000}
                        step={1000}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[5000, 10000, 25000, 50000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset.toString())}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            parseInt(amount) === preset
                              ? 'bg-primary text-white'
                              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                          }`}
                        >
                          ₦{preset.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="paymentMethod" className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Payment Method</label>
                    <select
                      id="paymentMethod"
                      title="Payment Method"
                      className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-on-surface transition-all appearance-none"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="" disabled>Select your payment method</option>
                      <option value="Debit/Credit Card">Debit/Credit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-primary to-primary-container text-white font-bold py-4 rounded-lg shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl [font-variation-settings:'FILL'_1]" aria-hidden="true">account_balance</span>
                        Make Deposit
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 sm:mt-10 p-4 sm:p-6 rounded-lg bg-surface-container-lowest/50 border border-outline-variant/20">
                  <h4 className="text-sm font-bold text-primary flex items-center mb-3">
                    <span className="material-symbols-outlined mr-2 text-lg">info</span>
                    Growth Forecast
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Increasing your monthly deposit to <strong>₦25,000</strong> would unlock the <strong>Platinum Portfolio</strong> benefits by Q4 2024.
                  </p>
                  <div className="mt-4 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-2/3"></div>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-bold text-on-surface-variant">
                    <span>CURRENT</span>
                    <span>TARGET</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-50/90 backdrop-blur-lg flex justify-around items-center py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200/80 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50" aria-label="Primary">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-500 min-w-0 px-1">
          <span className="material-symbols-outlined text-[22px]">dashboard</span>
          <span className="text-[10px] font-medium truncate max-w-[4.5rem]">Dashboard</span>
        </Link>
        <Link href="/loans" className="flex flex-col items-center gap-1 text-slate-500 min-w-0 px-1">
          <span className="material-symbols-outlined text-[22px]">payments</span>
          <span className="text-[10px] font-medium truncate max-w-[4.5rem]">Loans</span>
        </Link>
        <Link href="/contributions" className="flex flex-col items-center gap-1 text-sky-950 font-semibold min-w-0 px-1">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          <span className="text-[10px] truncate max-w-[4.5rem]">Contributions</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-500 min-w-0 px-1">
          <span className="material-symbols-outlined text-[22px]">person</span>
          <span className="text-[10px] font-medium truncate max-w-[4.5rem]">Profile</span>
        </Link>
      </nav>

      <a
        href="#new-contribution"
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Jump to new contribution"
      >
        <span className="material-symbols-outlined">add</span>
      </a>
    </div>
  );
}
