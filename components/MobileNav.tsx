'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function MobileNav() {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const navItems = [
    { href: '/dashboard', icon: 'dashboard', label: 'Home' },
    { href: '/loans', icon: 'payments', label: 'Loans' },
    { href: '/contributions', icon: 'account_balance_wallet', label: 'Funds' },
    { href: '/profile', icon: 'person', label: 'Profile' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 px-6 py-3 z-50 border-t border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-center">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 ${
              pathname === item.href
                ? 'text-primary'
                : 'text-slate-500'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings:
                  pathname === item.href ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
