'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  if (!user) return null

  const navItems = [
    { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { href: '/loans', icon: 'payments', label: 'Loans' },
    { href: '/contributions', icon: 'account_balance_wallet', label: 'Contributions' },
    { href: '/profile', icon: 'person', label: 'Profile' },
  ]

  if (user.role === 'admin') {
    navItems.push({ href: '/admin', icon: 'admin_panel_settings', label: 'Admin' })
  }

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-slate-50 dark:bg-slate-950 py-8 z-50 border-r border-slate-200 dark:border-slate-800">
      <div className="px-6 mb-10">
        <h1 className="text-lg font-extrabold text-sky-900 dark:text-sky-50 tracking-tight">
          MemberVault
        </h1>
        <p className="text-xs text-on-surface-variant">Club Member Portal</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${
              isActive(item.href)
                ? 'bg-sky-100/50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-100 border-r-4 border-sky-900 dark:border-sky-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:pl-4'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-4 mt-auto space-y-1 border-t border-slate-200/50 dark:border-slate-800/50 pt-4">
        {user.role === 'admin' && (
          <Link
            href="/admin/new-member"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-lg font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity mb-4"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Request Loan
          </Link>
        )}
        <Link
          href="/support"
          className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">help</span>
          <span className="text-sm">Support</span>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  )
}
