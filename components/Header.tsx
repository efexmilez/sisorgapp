'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  return (
    <header className="fixed top-0 w-full z-40 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl md:pl-64">
      <div className="flex justify-between items-center px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="md:hidden text-xl font-bold tracking-tight text-sky-900 dark:text-sky-100">
            MemberVault
          </span>
          <h2 className="hidden md:block text-xl font-bold tracking-tight text-sky-900 dark:text-sky-100 capitalize">
            {pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 w-64"
              placeholder="Search records..."
              type="text"
            />
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="hidden md:block p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button
            onClick={logout}
            className="md:hidden p-2 text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors"
            title="Logout"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="h-8 w-8 rounded-full bg-primary-container overflow-hidden">
              <span className="flex items-center justify-center h-full text-white font-bold text-sm">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden lg:block text-sm font-medium text-on-surface">{user.full_name.split(' ')[0]}</span>
          </div>
        </div>
      </div>
      <div className="bg-slate-200/20 dark:bg-slate-800/20 h-px w-full"></div>
    </header>
  )
}
