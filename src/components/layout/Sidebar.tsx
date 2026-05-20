'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import {
  LayoutDashboard,
  Building2,
  Users,
  Car,
  FileText,
  UserCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/branches', label: 'Branches', icon: Building2 },
  { href: '/dashboard/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/catalog', label: 'Catalog', icon: Car },
  { href: '/dashboard/quotations', label: 'Quotations', icon: FileText },
  { href: '/dashboard/customers', label: 'Customers', icon: UserCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger (hidden on desktop) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-5 left-5 z-50 md:hidden bg-white border border-slate-200 rounded-full p-3 text-slate-600 hover:bg-slate-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 
          flex flex-col transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto
        `}
      >
        {/* Close button (mobile only) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-5 right-5 md:hidden text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Brand */}
        <div className="p-8 pb-4">
          <h2 className="text-xl text-slate-900">Quotora</h2>
          {profile && (
            <p className="text-sm text-slate-500 mt-1 truncate">{profile.name}</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-5 py-3.5 rounded-full text-sm transition-all
                  ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-5 py-3.5 rounded-full text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all w-full"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
