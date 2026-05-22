'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Users, Target, FileText, PhoneCall, BarChart3, ArrowRight, TrendingUp, Clock, LogIn, LogOut } from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '@/components/ui/StatCard'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { AttendanceCheckInPanel } from '@/components/attendance/AttendanceCheckInPanel'

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
    href: '/branch/attendance',
    label: 'Attendance Manager',
    description: 'Monitor branch team check-in and working logs',
    icon: Clock,
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
  
  const [attendance, setAttendance] = useState<any>(null)
  const [attLoading, setAttLoading] = useState(true)
  const [showCheckInPanel, setShowCheckInPanel] = useState(false)

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
        <div className="lg:col-span-7 flex flex-col justify-center p-2 py-6">
          <p className="text-slate-500 text-xl font-medium">Welcome back,</p>
          <h2 className="text-5xl md:text-6xl font-black mt-2 tracking-tight">
            <span style={{ color: '#4285F4' }}>{profile?.name ? profile.name.split(' ')[0].charAt(0).toUpperCase() + profile.name.split(' ')[0].slice(1).toLowerCase() : ''}</span>
          </h2>
        </div>

        {/* Attendance Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Attendance
            </h3>
            {attendance && (
              <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                attendance.status === 'half_day'
                  ? 'bg-slate-50 text-slate-500 border-slate-200'
                  : (new Date(attendance.check_in).getHours() * 60 + new Date(attendance.check_in).getMinutes() > 555)
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-slate-100 text-slate-900 border-slate-300 font-semibold'
              }`}>
                {attendance.status === 'half_day'
                  ? 'Half Day'
                  : (new Date(attendance.check_in).getHours() * 60 + new Date(attendance.check_in).getMinutes() > 555)
                    ? 'Late'
                    : 'On Time'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-8 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Check-in</span>
              <span className="text-sm font-semibold text-slate-800">
                {attendance ? new Date(attendance.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '--:--'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Check-out</span>
              <span className="text-sm font-semibold text-slate-800">
                {attendance?.check_out ? new Date(attendance.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '--:--'}
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
                onClick={() => setShowCheckInPanel(prev => !prev)}
                className="w-full bg-slate-900 text-white font-medium rounded-full py-2.5 text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                {showCheckInPanel ? 'Close Check-In Panel' : 'Check-In for Today'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showCheckInPanel && profile && (
        <AttendanceCheckInPanel
          profile={{
            id: profile.id,
            tenant_id: profile.tenant_id,
            branch_id: profile.branch_id
          }}
          onSuccess={(record) => {
            setAttendance(record)
            setShowCheckInPanel(false)
          }}
          onCancel={() => setShowCheckInPanel(false)}
        />
      )}

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
