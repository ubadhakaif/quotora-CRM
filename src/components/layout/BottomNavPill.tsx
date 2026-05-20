'use client'

import {
  LayoutDashboard,
  Building2,
  Car,
  FileText,
  UserCircle,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/branches', label: 'Branches', icon: Building2 },
  { href: '/dashboard/catalog', label: 'Catalog', icon: Car },
  { href: '/dashboard/quotations', label: 'Quotes', icon: FileText },
  { href: '/dashboard/customers', label: 'CRM', icon: UserCircle },
]

export function BottomNavPill() {
  const pathname = usePathname()
  const { profile } = useAuth()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden">
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-2">
        {navItems
          .filter(item => {
            if (!profile) return false
            if (['/dashboard/branches'].includes(item.href)) {
              return profile.role === 'dealer_admin'
            }
            return true
          })
          .map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-full text-xs transition-all
                  ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
      </div>
    </nav>
  )
}
