'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  mockEligibility,
  mockLoans,
  formatNaira,
} from '@/lib/store';
import { getDueDate } from '@/lib/formatDate';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function LoansPage() {
  const router = useRouter();
  const { user, accessToken, logout, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'apply' | 'my-loans'>('apply');
  const [eligibility, setEligibility] = useState({ eligible: false, max_loan_amount_kobo: 0, max_loan_amount_display: '₦0.00', total_contributed_kobo: 0, total_contributed_display: '₦0.00', contribution_count: 0, reason: null });
  const [loans, setLoans] = useState<any[]>([]);
  
  // Form state
  const [loanAmount, setLoanAmount] = useState(500000);
  const [purpose, setPurpose] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (!accessToken) return;
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      const [eligRes, loansRes] = await Promise.all([
        fetch(`${API_URL}/loans/eligibility`, { headers }),
        fetch(`${API_URL}/loans/my-loans`, { headers }),
      ]);

      if (eligRes.ok) {
        const data = await eligRes.json();
        setEligibility({
          eligible: data.eligible || false,
          max_loan_amount_kobo: data.max_loan_amount_kobo || 0,
          max_loan_amount_display: data.max_loan_amount_display || formatNaira(0),
          total_contributed_kobo: data.total_contributed_kobo || 0,
          total_contributed_display: data.total_contributed_display || formatNaira(0),
          contribution_count: data.contribution_count || 0,
          reason: data.reason || null,
        });
      }

      if (loansRes.ok) {
        const data = await loansRes.json();
        if (data.data) {
          setLoans(data.data.map((l: any) => ({
            id: l.id,
            amount_requested_kobo: l.amount_requested_kobo || l.amount_requested || 0,
            amount_requested_display: l.amount_requested_display || formatNaira(l.amount_requested_kobo || l.amount_requested || 0),
            amount_approved_kobo: l.amount_approved_kobo || l.amount_approved || l.amount_requested_kobo || l.amount_requested || 0,
            amount_approved_display: l.amount_approved_display || formatNaira(l.amount_approved_kobo || l.amount_approved || l.amount_requested_kobo || l.amount_requested || 0),
            total_repayment_display: l.total_repayment_display || formatNaira(l.total_repayment_kobo || l.total_repayment || l.amount_requested_kobo || l.amount_requested || 0),
            status: l.status,
            applied_at: l.applied_at || 'N/A',
            due_date: l.due_date || 'N/A',
            purpose: l.purpose,
            paid_to_date_kobo: 0,
            interestAmount: Math.round((l.amount_requested_kobo || l.amount_requested || 0) * ((l.interest_rate || 5) / 100)),
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const interestRate = 5;
  const interestAmount = Math.round(loanAmount * (interestRate / 100));
  const totalRepayment = loanAmount + interestAmount;
  const dueDate = getDueDate(90);

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (purpose.length < 20) {
      setErrorMessage('Please describe your loan purpose (minimum 20 characters)');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('You must accept the loan terms to proceed');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/loans/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amount_kobo: loanAmount,
          purpose: purpose,
          terms_accepted: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit loan application');
      }

      const data = await response.json();
      
      const newLoan = {
        id: data.id,
        amount_requested_kobo: loanAmount,
        amount_requested_display: formatNaira(loanAmount),
        amount_approved_kobo: data.amount_approved_kobo || 0,
        amount_approved_display: formatNaira(data.amount_approved_kobo || 0),
        total_repayment_display: formatNaira(data.total_repayment_kobo || 0),
        status: 'pending' as const,
        applied_at: new Date().toLocaleDateString('en-GB'),
        due_date: data.due_date,
        purpose: purpose,
        paid_to_date_kobo: 0,
      };
      
      setLoans([newLoan, ...loans]);
      setSuccessMessage(data.message || 'Your loan application has been submitted successfully!');
      setPurpose('');
      setTermsAccepted(false);
      setActiveTab('my-loans');
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disbursed':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase">Disbursed</span>;
      case 'approved':
        return <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase">Approved</span>;
      case 'pending':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">Pending</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 text-[10px] font-bold rounded-full uppercase">Rejected</span>;
      case 'repaid':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">Repaid</span>;
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
    <div className="bg-background text-on-background min-h-screen">
      {/* SideNavBar */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 border-r-0 bg-slate-50 flex-col py-8 z-50">
        <div className="px-6 mb-10">
          <h1 className="text-lg font-black text-sky-950">The Vault</h1>
          <p className="text-xs text-on-surface-variant opacity-70">Club Member Portal</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200/50 hover:pl-2 transition-all duration-300 rounded-xl">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/loans" className="flex items-center gap-3 px-4 py-3 bg-sky-100/50 text-sky-950 border-r-4 border-sky-900 hover:pl-2 transition-all duration-300 rounded-sm">
            <span className="material-symbols-outlined">payments</span>
            <span className="font-semibold">Loans</span>
          </Link>
          <Link href="/contributions" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200/50 hover:pl-2 transition-all duration-300 rounded-xl">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="font-medium">Contributions</span>
          </Link>
          <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200/50 hover:pl-2 transition-all duration-300 rounded-xl">
            <span className="material-symbols-outlined">person</span>
            <span className="font-medium">Profile</span>
          </Link>
        </nav>
        <div className="mt-auto px-4 space-y-2">
          <button className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-3 rounded-xl font-semibold text-sm mb-6 flex items-center justify-center gap-2 shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined text-sm">add</span> Request Loan
          </button>
          <button className="flex items-center gap-3 px-4 py-2 text-slate-500 text-sm hover:text-primary transition-colors w-full">
            <span className="material-symbols-outlined">help</span>
            <span>Support</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-slate-500 text-sm hover:text-error transition-colors">
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl md:pl-64">
        <div className="flex justify-between items-center px-6 py-3 w-full">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold tracking-tight text-sky-950">MemberVault</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 w-64" placeholder="Search portfolios..." type="text"/>
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 transition-colors rounded-full">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 transition-colors rounded-full">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
              {user.full_name?.[0] || 'M'}
            </div>
          </div>
        </div>
        <div className="bg-slate-200/20 h-px w-full"></div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6 md:ml-64 max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-extrabold text-primary tracking-tight mb-2">Your Loan Portfolio</h2>
            <p className="text-on-surface-variant max-w-md">Manage your loan applications, track repayment progress, and view your borrowing history.</p>
          </div>
          {eligibility.eligible && (
            <div className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-4 shadow-sm border border-outline-variant/10">
              <div className="bg-primary/5 p-3 rounded-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Available Limit</p>
                <p className="text-xl font-bold text-primary">{formatNaira(eligibility.max_loan_amount_kobo)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('apply')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'apply'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Apply for Loan
          </button>
          <button
            onClick={() => setActiveTab('my-loans')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'my-loans'
                ? 'bg-primary text-white shadow-lg'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-surface-container-high'
            }`}
          >
            My Loans ({loans.length})
          </button>
        </div>

        {/* Apply Tab */}
        {activeTab === 'apply' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Eligibility Info */}
            <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
              <h3 className="text-xl font-bold text-on-surface mb-6">Loan Eligibility</h3>
              
              {eligibility.eligible ? (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      You're eligible for a loan!
                    </div>
                    <p className="text-sm text-green-700">
                      Based on {eligibility.contribution_count} months of contributions totaling {eligibility.total_contributed_display}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 block">
                        Loan Amount (₦)
                      </label>
                      <input
                        type="range"
                        min={500000}
                        max={eligibility.max_loan_amount_kobo}
                        step={50000}
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(parseInt(e.target.value))}
                        className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-on-surface-variant mt-1">
                        <span>{formatNaira(500000)}</span>
                        <span className="font-bold text-primary">{formatNaira(loanAmount)}</span>
                        <span>{formatNaira(eligibility.max_loan_amount_kobo)}</span>
                      </div>
                    </div>

                    {/* Loan Calculator */}
                    <div className="bg-surface-container-low rounded-lg p-6 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Loan Amount</span>
                        <span className="font-bold">{formatNaira(loanAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Interest (5%)</span>
                        <span className="font-bold text-amber-600">{formatNaira(interestAmount)}</span>
                      </div>
                      <div className="h-px bg-outline-variant/20"></div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total Repayment</span>
                        <span className="text-primary">{formatNaira(totalRepayment)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Due Date</span>
                        <span className="font-medium">{dueDate}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 block">
                        Purpose of Loan <span className="text-error">*</span>
                      </label>
                      <textarea
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="e.g. Purchase of business equipment for my tailoring shop in Yaba, Lagos"
                        className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-on-surface transition-all"
                        rows={3}
                      />
                      <p className="text-xs text-on-surface-variant mt-1">{purpose.length}/20 characters minimum</p>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-2 border-primary accent-primary"
                      />
                      <span className="text-sm text-on-surface-variant">
                        I agree to repay <strong>{formatNaira(totalRepayment)}</strong> by <strong>{dueDate}</strong>. I understand this is a formal obligation under SIS Club rules.
                      </span>
                    </label>

                    {errorMessage && (
                      <div className="p-3 bg-error-container text-on-error-container rounded-lg text-sm">
                        {errorMessage}
                      </div>
                    )}

                    {successMessage && (
                      <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                        {successMessage}
                      </div>
                    )}

                    <button
                      onClick={handleSubmitApplication}
                      disabled={submitting || !termsAccepted || purpose.length < 20}
                      className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">progress_activity</span>
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Application
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
                    <span className="material-symbols-outlined text-amber-600">info</span>
                    Not Eligible Yet
                  </div>
                  <p className="text-sm text-amber-700">{eligibility.reason}</p>
                </div>
              )}
            </div>

            {/* Loan Info */}
            <div className="space-y-6">
              <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/10">
                <h3 className="text-lg font-bold text-on-surface mb-4">Loan Terms</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">percent</span>
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface">5% Interest Rate</p>
                      <p className="text-xs text-on-surface-variant">Flat rate, no hidden charges</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface">90 Days Repayment</p>
                      <p className="text-xs text-on-surface-variant">Flexible monthly installments</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-sm">account_balance</span>
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface">Up to 3x Savings</p>
                      <p className="text-xs text-on-surface-variant">Borrow up to 3 times your total savings</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary text-white rounded-xl p-8">
                <h3 className="text-lg font-bold mb-4">Why Borrow from SIS Club?</h3>
                <ul className="space-y-3 text-primary-fixed/90 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Lower interest rates than traditional banks
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    No collateral required
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Quick approval process
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Builds your credit history within the club
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* My Loans Tab */}
        {activeTab === 'my-loans' && (
          <div>
            {loans.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl p-12 text-center border border-outline-variant/10">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4 block">payments</span>
                <h3 className="text-xl font-bold text-on-surface mb-2">No Loan Applications</h3>
                <p className="text-on-surface-variant mb-6">You haven't applied for any loans yet.</p>
                <button
                  onClick={() => setActiveTab('apply')}
                  className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Apply for a Loan
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div key={loan.id} className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-on-surface">Loan Application</h4>
                          {getStatusBadge(loan.status)}
                        </div>
                        <p className="text-sm text-on-surface-variant mb-2">{loan.purpose}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant">
                          <span>Applied: {loan.applied_at}</span>
                          <span>•</span>
                          <span>Due: {loan.due_date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-on-surface-variant">Amount</p>
                        <p className="text-2xl font-bold text-primary">{formatNaira(loan.amount_requested_kobo)}</p>
                        <p className="text-sm text-on-surface-variant">
                          Repay: <span className="font-semibold">{loan.total_repayment_display}</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress for disbursed loans */}
                    {loan.status === 'disbursed' && (
                      <div className="mt-4 pt-4 border-t border-outline-variant/10">
                        <div className="flex justify-between text-xs text-on-surface-variant mb-2">
                          <span>Repayment Progress</span>
                          <span>{formatNaira(loan.paid_to_date_kobo || 0)} / {loan.total_repayment_display}</span>
                        </div>
                        <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${((loan.paid_to_date_kobo || 0) / ((loan.amount_requested_kobo || 0) + (loan.interestAmount || 0))) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-50 px-6 py-4 flex justify-around items-center z-50 border-t border-outline-variant/10">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold uppercase">Home</span>
        </Link>
        <button className="flex flex-col items-center gap-1 text-sky-950">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          <span className="text-[10px] font-bold uppercase">Loans</span>
        </button>
        <Link href="/contributions" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <span className="text-[10px] font-bold uppercase">Wallet</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-500">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold uppercase">User</span>
        </Link>
      </nav>
    </div>
  );
}
