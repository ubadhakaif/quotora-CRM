'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  onMenuClick: () => void
  routeTitles: Record<string, string>
}

export function Header({ onMenuClick, routeTitles }: HeaderProps) {
  const pathname = usePathname()
  const { profile } = useAuth()
  
  let title = routeTitles[pathname]
  if (!title) {
    if (pathname.startsWith('/branch/quotations/')) {
      title = 'Quotation Details'
    } else if (pathname.startsWith('/dashboard/quotations/')) {
      title = 'Quotation Details'
    } else if (pathname.startsWith('/branch/attendance/')) {
      title = 'Attendance Verification'
    } else if (pathname.startsWith('/dashboard/attendance/')) {
      title = 'Attendance Verification'
    } else {
      title = 'Dashboard'
    }
  }

  const getProfileLink = () => {
    if (!profile) return '#'
    if (profile.role === 'dealer_admin') return '/dashboard/profile'
    if (profile.role === 'branch_manager') return '/branch/profile'
    return '/sales/profile'
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-100">
      <div className="flex items-center justify-between px-6 md:px-12 py-4">
        <div className="flex items-center gap-3">
          {/* Hamburger menu for mobile/tablet */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg text-slate-900">{title}</h1>
        </div>
        {profile && (
          <div className="flex items-center gap-3">
            <Link
              href={getProfileLink()}
              className="hover:opacity-80 active:scale-95 transition-all outline-none"
              title="View Profile"
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
