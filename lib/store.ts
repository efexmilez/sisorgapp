import { formatNaira } from './formatNaira';
import { formatDate } from './formatDate';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  kyc_status: 'pending' | 'approved' | 'rejected';
  state: string;
  lga: string;
  street_address: string;
  area: string;
  bank_account_number: string;
  bank_code: string;
  bank_name: string;
  bvn?: string;
}

export interface ContributionBalance {
  total_contributed_kobo: number;
  total_disbursed_kobo: number;
  net_balance_kobo: number;
  max_loan_amount_kobo: number;
  contribution_count: number;
}

export interface Contribution {
  id: string;
  amount_kobo: number;
  amount_display: string;
  status: 'success' | 'pending' | 'failed';
  paid_at_wat: string;
  paid_at_iso: string;
  paystack_reference: string;
  channel: string;
}

export interface DVA {
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_code: string;
  instruction: string;
}

export interface Loan {
  id: string;
  amount_requested_kobo: number;
  amount_requested_display: string;
  amount_approved_kobo: number;
  amount_approved_display: string;
  total_repayment_display: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'repaid';
  applied_at: string;
  due_date: string;
  purpose: string;
  paid_to_date_kobo?: number;
}

export interface LoanEligibility {
  eligible: boolean;
  max_loan_amount_kobo: number;
  max_loan_amount_display: string;
  total_contributed_kobo: number;
  total_contributed_display: string;
  contribution_count: number;
  reason: string | null;
}

// Mock data
export const mockUser: User = {
  id: 'uuid-123',
  full_name: 'Alex Thompson',
  email: 'alex.v@membervault.com.ng',
  phone: '+2348031234567',
  role: 'member',
  kyc_status: 'approved',
  state: 'Lagos',
  lga: 'Eti-Osa',
  street_address: '24 Adetokunbo Ademola Street',
  area: 'Victoria Island',
  bank_account_number: '0123456789',
  bank_code: '058',
  bank_name: 'GTBank',
};

export const mockBalance: ContributionBalance = {
  total_contributed_kobo: 48250000,
  total_disbursed_kobo: 0,
  net_balance_kobo: 48250000,
  max_loan_amount_kobo: 96500000,
  contribution_count: 9,
};

export const mockContributions: Contribution[] = [
  {
    id: '1',
    amount_kobo: 500000,
    amount_display: '₦5,000.00',
    status: 'success',
    paid_at_wat: '14/11/2025, 2:34 pm',
    paid_at_iso: '2025-11-14T13:34:00Z',
    paystack_reference: 'ref_abc123',
    channel: 'dedicated_account',
  },
  {
    id: '2',
    amount_kobo: 500000,
    amount_display: '₦5,000.00',
    status: 'success',
    paid_at_wat: '14/10/2025, 10:15 am',
    paid_at_iso: '2025-10-14T09:15:00Z',
    paystack_reference: 'ref_def456',
    channel: 'dedicated_account',
  },
  {
    id: '3',
    amount_kobo: 5000000,
    amount_display: '₦50,000.00',
    status: 'success',
    paid_at_wat: '28/09/2025, 3:45 pm',
    paid_at_iso: '2025-09-28T14:45:00Z',
    paystack_reference: 'ref_ghi789',
    channel: 'transfer',
  },
  {
    id: '4',
    amount_kobo: 500000,
    amount_display: '₦5,000.00',
    status: 'pending',
    paid_at_wat: 'Pending',
    paid_at_iso: '',
    paystack_reference: 'ref_jkl012',
    channel: 'dedicated_account',
  },
];

export const mockDVA: DVA = {
  account_number: '9876543210',
  account_name: 'SIS CLUB - ALEX THOMPSON',
  bank_name: 'Wema Bank',
  bank_code: '035',
  instruction: 'Transfer ₦5,000 to this account monthly. Use your banking app or dial *945*0# for USSD.',
};

export const mockLoans: Loan[] = [
  {
    id: 'loan-1',
    amount_requested_kobo: 2000000,
    amount_requested_display: '₦20,000.00',
    amount_approved_kobo: 2000000,
    amount_approved_display: '₦20,000.00',
    total_repayment_display: '₦21,000.00',
    status: 'disbursed',
    applied_at: '14/11/2025',
    due_date: '14/02/2026',
    purpose: 'Purchase of business equipment for my tailoring shop in Yaba',
    paid_to_date_kobo: 0,
  },
];

export const mockEligibility: LoanEligibility = {
  eligible: true,
  max_loan_amount_kobo: 96500000,
  max_loan_amount_display: '₦965,000.00',
  total_contributed_kobo: 48250000,
  total_contributed_display: '₦482,500.00',
  contribution_count: 9,
  reason: null,
};

// Auth helpers
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('sis_user');
  return stored ? JSON.parse(stored) : null;
}

export function setStoredUser(user: User): void {
  localStorage.setItem('sis_user', JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem('sis_user');
}

export function isAuthenticated(): boolean {
  return getStoredUser() !== null;
}

// Format helpers
export { formatNaira, formatDate };
