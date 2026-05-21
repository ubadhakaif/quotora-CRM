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
  X,
  Landmark,
  BarChart3,
  Settings,
  Target,
  PhoneCall,
  Calculator,
  RefreshCw,
  Clock,
  CalendarDays,
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from '@/lib/permissions'

// ─── Icon Resolver ───
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
  Users,
  Car,
  FileText,
  UserCircle,
  Landmark,
  BarChart3,
  Settings,
  Target,
  PhoneCall,
  Calculator,
  RefreshCw,
  Clock,
  CalendarDays,
  Wrench,
}

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  navItems: NavItem[]
  portalName: string
}

export function Sidebar({ isOpen, setIsOpen, navItems, portalName }: SidebarProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 
          flex flex-col transition-transform duration-200
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto
        `}
      >
        {/* Close button (mobile only) */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 md:hidden text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        {/* Brand */}
        <div className="p-8 pb-4">
          <h2 className="text-xl text-slate-900">{portalName}</h2>
          {profile && (
            <p className="text-sm text-slate-500 mt-1 truncate">{profile.name}</p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = iconMap[item.icon] || LayoutDashboard
            const basePath = navItems[0]?.href || '/'
            const isActive = pathname === item.href || 
              (item.href !== basePath && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
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
