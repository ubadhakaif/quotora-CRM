'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Users, Target, FileText, PhoneCall, BarChart3, ArrowRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const quickLinks = [
  {
    href: '/branch/employees',
    label: 'Employees',
    description: 'View and monitor branch staff',
    icon: Users,
  },
  {
    href: '/branch/leads',
    label: 'Leads',
    description: 'Manage and assign customer leads',
    icon: Target,
  },
  {
    href: '/branch/quotations',
    label: 'Quotations',
    description: 'Approve and track quotations',
    icon: FileText,
  },
  {
    href: '/branch/follow-ups',
    label: 'Follow-ups',
    description: 'Monitor team follow-ups',
    icon: PhoneCall,
  },
  {
    href: '/branch/analytics',
    label: 'Analytics',
    description: 'Branch performance metrics',
    icon: BarChart3,
  },
]

export default function BranchDashboardPage() {
  const { profile, loading } = useAuth()
  const [stats, setStats] = useState({
    quotationsToday: 0,
    pendingFollowUps: 0,
    activeLeads: 0,
    revenueThisMonth: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!profile?.branch_id) return
      const supabase = createClient()
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const [quotesToday, followUps, leads, quotesMonth] = await Promise.all([
        supabase.from('quotations').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('follow_ups').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).in('status', ['new', 'hot', 'warm']),
        supabase.from('quotations').select('total_price').gte('created_at', thisMonth.toISOString())
      ])

      const totalRevenue = (quotesMonth.data || []).reduce((acc: number, q: any) => acc + (Number(q.total_price) || 0), 0)

      setStats({
        quotationsToday: quotesToday.count || 0,
        pendingFollowUps: followUps.count || 0,
        activeLeads: leads.count || 0,
        revenueThisMonth: totalRevenue,
      })
      setStatsLoading(false)
    }

    if (!loading && profile) {
      fetchStats()
    }
  }, [profile, loading])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-28 w-full rounded-[2rem]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton h-32 rounded-[2rem]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12">
        <p className="text-slate-500 text-sm">Welcome back</p>
        <h2 className="text-2xl mt-1">
          <span style={{ color: '#4285F4' }}>{profile?.name}</span>
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Quotations (Today)"
          value={statsLoading ? '...' : stats.quotationsToday}
          icon={FileText}
        />
        <StatCard
          label="Pending Follow-ups"
          value={statsLoading ? '...' : stats.pendingFollowUps}
          icon={PhoneCall}
        />
        <StatCard
          label="Active Leads"
          value={statsLoading ? '...' : stats.activeLeads}
          icon={Target}
        />
        <StatCard
          label="Revenue (This Month)"
          value={statsLoading ? '...' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(stats.revenueThisMonth)}
          icon={TrendingUp}
        />
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(link => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 flex flex-col gap-4 hover:border-slate-300 transition-all"
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
