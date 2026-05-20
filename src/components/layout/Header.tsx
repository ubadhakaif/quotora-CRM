'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

// Map route segments to page titles
const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/branches': 'Branches',
  '/dashboard/employees': 'Employees',
  '/dashboard/catalog': 'Catalog',
  '/dashboard/catalog/models': 'Models',
  '/dashboard/catalog/variants': 'Variants',
  '/dashboard/catalog/accessories': 'Accessories',
  '/dashboard/quotations': 'Quotations',
  '/dashboard/customers': 'Customers',
}

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const { profile } = useAuth()
  
  const title = routeTitles[pathname] || 'Dashboard'

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
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm text-slate-600">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
