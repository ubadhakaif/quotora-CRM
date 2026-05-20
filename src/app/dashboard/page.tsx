'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Building2, Users, Car, FileText, UserCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const quickLinks = [
  {
    href: '/dashboard/branches',
    label: 'Branches',
    description: 'Manage your dealership branches',
    icon: Building2,
  },
  {
    href: '/dashboard/employees',
    label: 'Employees',
    description: 'Directory of your team',
    icon: Users,
  },
  {
    href: '/dashboard/catalog',
    label: 'Catalog',
    description: 'Models, variants, and accessories',
    icon: Car,
  },
  {
    href: '/dashboard/quotations',
    label: 'Quotations',
    description: 'Build and manage quotes',
    icon: FileText,
  },
  {
    href: '/dashboard/customers',
    label: 'Customers',
    description: 'Your customer directory',
    icon: UserCircle,
  },
]

export default function DashboardPage() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-28 w-full rounded-[3rem]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-32 rounded-[3rem]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="bg-white border border-slate-200 rounded-[3.5rem] p-8 md:p-12">
        <p className="text-slate-500 text-sm">Welcome back</p>
        <h2 className="text-2xl mt-1">
          <span style={{ color: '#4285F4' }}>{profile?.name}</span>
        </h2>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(link => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white border border-slate-200 rounded-[3rem] p-8 md:p-10 flex flex-col gap-4 hover:border-slate-300 transition-all"
            >
              <Icon size={22} className="text-slate-500 group-hover:text-slate-900 transition-colors" />
              <div className="space-y-1">
                <p className="text-slate-900">{link.label}</p>
                <p className="text-sm text-slate-500">{link.description}</p>
              </div>
              <div className="mt-auto pt-2">
                <span className="inline-flex items-center gap-2 text-sm text-slate-400 group-hover:text-slate-900 transition-colors">
                  Open <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
