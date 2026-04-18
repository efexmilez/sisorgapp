'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';
import StatusBadge from '@/components/admin/StatusBadge';
import Pagination from '@/components/admin/Pagination';
import { getUsers } from '@/lib/adminApi';
import type { UserRow, Pagination as PaginationMeta } from '@/lib/adminApi';

export default function AdminMembers() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [members, setMembers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

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
      console.error('Fetch members error:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter, page]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = members.filter(
    (m) =>
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search)
  );

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending KYC' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Members</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{pagination.total} members total</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            type="text"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Member</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Phone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">Location</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">ID Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">KYC Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider hidden md:table-cell">Joined</th>
                <th className="px-6 py-3"></th>
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
                    <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">group</span>
                    <p className="text-on-surface-variant">No members found</p>
                  </td>
                </tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {m.full_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-on-surface">{m.full_name}</p>
                        <p className="text-xs text-on-surface-variant truncate">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface hidden md:table-cell">{m.phone}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant hidden lg:table-cell">{m.lga}, {m.state}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant hidden lg:table-cell">{m.id_type || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={m.kyc_status} /></td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant hidden md:table-cell">{m.created_at}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/members/${m.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-medium rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-4">
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPage={(p) => setPage(p)}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
