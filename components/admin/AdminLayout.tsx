'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: 'dashboard' },
  { href: '/admin/members', label: 'Members', icon: 'group' },
  { href: '/admin/kyc', label: 'KYC', icon: 'verified_user' },
  { href: '/admin/deposits', label: 'Deposits', icon: 'payments' },
  { href: '/admin/loans', label: 'Loans', icon: 'account_balance' },
  { href: '/admin/audit', label: 'Audit Log', icon: 'history' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-container-lowest border-r border-outline-variant/20 fixed inset-y-0 left-0 z-40">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-outline-variant/15">
          <p className="text-xl font-bold font-headline text-primary tracking-tight">SIS Club Admin</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Management Console</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-outline-variant/15">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.full_name?.[0] || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-on-surface truncate">{user?.full_name || 'Admin'}</p>
              <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-on-surface-variant hover:text-error rounded-md transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 w-full z-40 bg-surface-container-lowest border-b border-outline-variant/15 px-4 py-3 flex items-center justify-between">
        <p className="text-lg font-bold font-headline text-primary">SIS Club Admin</p>
        <div className="flex items-center gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`p-1.5 rounded-md transition-colors ${
                isActive(item.href) ? 'text-primary' : 'text-on-surface-variant'
              }`}
              title={item.label}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
            </Link>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
