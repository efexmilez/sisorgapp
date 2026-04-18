/**
 * Admin API client — wraps all admin backend calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function req<T>(
  path: string,
  token: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json as T;
}

export interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}

// ─── Liquidity ────────────────────────────────────────────────────────────

export interface LiquidityData {
  total_contributed_kobo: number;
  total_contributed_display: string;
  total_disbursed_kobo: number;
  total_disbursed_display: string;
  available_kobo: number;
  available_display: string;
  total_users: number;
  kyc_pending: number;
  total_loaned_kobo: number;
  total_loaned_display: string;
  active_loans: number;
  pending_loans: number;
  // Legacy aliases used by the dashboard
  total_members?: number;
  approved_members?: number;
  active_loans_count?: number;
  pending_loans_count?: number;
}

export const getLiquidity = (token: string) =>
  req<LiquidityData>('/admin/liquidity', token);

// ─── Users ────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  state: string;
  lga: string;
  id_type: string;
  id_number_masked: string;
  kyc_status: string;
  national_id_url: string | null;
  utility_bill_url: string | null;
  created_at: string;
}

export interface UserDetail extends UserRow {
  role: string;
  street_address: string;
  area: string;
  id_doc_url: string | null;
  national_id_url: string | null;
  utility_bill_url: string | null;
  kyc_rejection_reason: string | null;
  bank_account_number: string;
  bvn: string;
  bank_name: string;
  balance: { total_contributed_display: string; total_disbursed_display: string; net_display: string };
  dva: { account_number: string; account_name: string; bank_name: string } | null;
  recent_loans: any[];
  recent_contributions: any[];
}

export const getUsers = (token: string, params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return req<{ data: UserRow[]; pagination: Pagination }>(`/admin/users?${qs}`, token);
};

export const getUserDetail = (token: string, id: string) =>
  req<UserDetail>(`/admin/users/${id}`, token);

export const editUser = (token: string, id: string, body: Partial<UserDetail>) =>
  req(`/admin/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) });

export const reviewKyc = (
  token: string,
  userId: string,
  status: 'approved' | 'rejected',
  rejection_reason?: string
) =>
  req(`/admin/users/${userId}/kyc`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, rejection_reason }),
  });

// ─── Loans ────────────────────────────────────────────────────────────────

export interface LoanRow {
  id: string;
  user: { full_name: string; phone: string };
  amount_requested_display: string;
  amount_approved_display: string;
  member_total_savings_display: string;
  total_repayment_display: string;
  status: string;
  applied_at: string;
  purpose: string;
}

export const getLoans = (token: string, params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return req<{ data: LoanRow[]; pagination: Pagination }>(`/admin/loans?${qs}`, token);
};

export const reviewLoan = (
  token: string,
  loanId: string,
  status: 'approved' | 'rejected',
  admin_notes: string,
  amount_approved_kobo?: number
) =>
  req(`/admin/loans/${loanId}/review`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status, admin_notes, amount_approved_kobo }),
  });

export const disburseLoan = (token: string, loanId: string) =>
  req(`/admin/loans/${loanId}/disburse`, token, { method: 'PATCH', body: JSON.stringify({}) });

// ─── Contributions / Deposits ─────────────────────────────────────────────

export interface ContributionRow {
  id: string;
  user_id: string;
  user: { full_name: string; email: string; phone: string };
  amount_kobo: number;
  amount_display: string;
  status: string;
  channel: string | null;
  paystack_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

export const getContributions = (token: string, params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return req<{ data: ContributionRow[]; pagination: Pagination }>(`/admin/contributions?${qs}`, token);
};

export const approveContribution = (token: string, id: string) =>
  req(`/admin/contributions/${id}/approve`, token, { method: 'PATCH', body: JSON.stringify({}) });

export const rejectContribution = (token: string, id: string, reason: string) =>
  req(`/admin/contributions/${id}/reject`, token, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });

// ─── Audit Log ────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  collection: string;
  record_id: string;
  diff: Record<string, any>;
  created_at: string;
}

export const getAuditLog = (token: string, params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return req<{ data: AuditEntry[]; pagination: Pagination }>(`/admin/audit-log?${qs}`, token);
};
