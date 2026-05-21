'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { UserCircle, FileText, Calculator, PhoneCall, RefreshCw, ArrowRight, Target } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatCard } from '@/components/ui/StatCard'

const quickLinks = [
  {
    href: '/sales/quotations',
    label: 'Quotations',
    description: 'Build, calculate and manage vehicle quotes',
    icon: FileText,
  },
  {
    href: '/sales/emi',
    label: 'EMI Calculator',
    description: 'Calculate and compare vehicle loan plans',
    icon: Calculator,
  },
  {
    href: '/sales/follow-ups',
    label: 'Follow-ups',
    description: 'Schedule and record customer follow-ups',
    icon: PhoneCall,
  },
  {
    href: '/sales/exchange',
    label: 'Exchange',
    description: 'Add and evaluate trade-in vehicle details',
    icon: RefreshCw,
  },
]

export default function SalesDashboardPage() {
  const { profile, loading } = useAuth()
  const [stats, setStats] = useState({
    todayFollowUps: 0,
    draftQuotations: 0,
    activeLeads: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!profile?.id) return
      setStatsLoading(true)
      const supabase = createClient()

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const [followUpsRes, quotesRes, leadsRes] = await Promise.all([
        supabase
          .from('follow_ups')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', profile.id)
          .eq('status', 'pending')
          .gte('due_date', todayStart.toISOString())
          .lte('due_date', todayEnd.toISOString()),
        supabase
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', profile.id)
          .eq('status', 'draft'),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', profile.id)
          .in('status', ['new', 'hot', 'warm']),
      ])

      setStats({
        todayFollowUps: followUpsRes.count || 0,
        draftQuotations: quotesRes.count || 0,
        activeLeads: leadsRes.count || 0,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 rounded-[2rem]" />
          ))}
        </div>
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
      {/* Welcome Card */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12">
        <p className="text-slate-500 text-sm">Welcome back</p>
        <h2 className="text-2xl mt-1">
          <span style={{ color: '#4285F4' }}>{profile?.name}</span>
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Today's Follow-ups"
          value={statsLoading ? '...' : stats.todayFollowUps}
          icon={PhoneCall}
        />
        <StatCard
          label="Draft Quotations"
          value={statsLoading ? '...' : stats.draftQuotations}
          icon={FileText}
        />
        <StatCard
          label="Active Leads"
          value={statsLoading ? '...' : stats.activeLeads}
          icon={Target}
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
