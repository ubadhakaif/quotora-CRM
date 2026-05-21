'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { UserCircle, FileText, PhoneCall, ArrowRight, Target, Clock, LogIn, LogOut } from 'lucide-react'
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
    href: '/sales/follow-ups',
    label: 'Follow-ups',
    description: 'Schedule and record customer follow-ups',
    icon: PhoneCall,
  },
  {
    href: '/sales/attendance',
    label: 'My Attendance',
    description: 'View check-in logs and work hours report',
    icon: Target,
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
  
  const [attendance, setAttendance] = useState<any>(null)
  const [attLoading, setAttLoading] = useState(true)

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

    async function fetchAttendance() {
      if (!profile?.id) return
      setAttLoading(true)
      const supabase = createClient()
      const todayStr = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('date', todayStr)
        .maybeSingle()

      if (data) {
        setAttendance(data)
      } else {
        setAttendance(null)
      }
      setAttLoading(false)
    }

    if (!loading && profile) {
      fetchStats()
      fetchAttendance()
    }
  }, [profile, loading])

  const handleCheckIn = async () => {
    if (!profile) return
    setAttLoading(true)
    const supabase = createClient()
    const todayStr = new Date().toISOString().split('T')[0]
    
    const newEntry = {
      tenant_id: profile.tenant_id,
      branch_id: profile.branch_id,
      profile_id: profile.id,
      date: todayStr,
      check_in: new Date().toISOString(),
      status: 'present'
    }

    const { data, error } = await supabase
      .from('employee_attendance')
      .insert(newEntry)
      .select()
      .single()

    if (error) {
      console.error(error.message)
    } else {
      setAttendance(data)
    }
    setAttLoading(false)
  }

  const handleCheckOut = async () => {
    if (!profile || !attendance?.id) return
    setAttLoading(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('employee_attendance')
      .update({ check_out: new Date().toISOString() })
      .eq('id', attendance.id)
      .select()
      .single()

    if (error) {
      console.error(error.message)
    } else {
      setAttendance(data)
    }
    setAttLoading(false)
  }

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
      {/* Top Section: Welcome & Attendance check-in/out */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Welcome Card */}
        <div className="lg:col-span-7 flex flex-col justify-center p-2">
          <p className="text-slate-500 text-sm">Welcome back,</p>
          <h2 className="text-3xl mt-1 font-bold text-slate-950">
            {profile?.name ? profile.name.split(' ')[0] : ''}
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-medium text-slate-500">
            {profile?.role === 'employee' ? 'Sales executive' : profile?.role === 'branch_manager' ? 'Branch manager' : 'Dealer admin'}
          </p>
        </div>

        {/* Attendance Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Attendance
            </h3>
          </div>

          <div className="flex items-center gap-8 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Check-in</span>
              <span className="text-sm font-semibold text-slate-800">
                {attendance ? new Date(attendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Check-out</span>
              <span className="text-sm font-semibold text-slate-800">
                {attendance?.check_out ? new Date(attendance.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
          </div>

          <div>
            {attLoading ? (
              <div className="h-11 w-full skeleton rounded-full" />
            ) : attendance ? (
              !attendance.check_out ? (
                <button
                  onClick={handleCheckOut}
                  className="w-full bg-slate-900 text-white font-medium rounded-full py-2.5 text-xs hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Check-Out for Today
                </button>
              ) : (
                <button
                  disabled
                  className="w-full bg-slate-50 text-slate-400 font-medium rounded-full py-2.5 text-xs border border-slate-200 cursor-not-allowed"
                >
                  Shift Completed
                </button>
              )
            ) : (
              <button
                onClick={handleCheckIn}
                className="w-full bg-slate-900 text-white font-medium rounded-full py-2.5 text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Check-In for Today
              </button>
            )}
          </div>
        </div>
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
