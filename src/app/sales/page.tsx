'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { FileText, LogIn, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AttendanceCheckInPanel } from '@/components/attendance/AttendanceCheckInPanel'

export default function SalesDashboardPage() {
  const { profile, loading } = useAuth()
  const [attendance, setAttendance] = useState<any>(null)
  const [attLoading, setAttLoading] = useState(true)
  const [showCheckInPanel, setShowCheckInPanel] = useState(false)

  useEffect(() => {
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
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Section: Welcome & Attendance check-in/out */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Welcome Card */}
        <div className="lg:col-span-7 flex flex-col justify-center p-2 py-3">
          <p className="text-slate-500 text-xl font-medium">Welcome back,</p>
          <h2 className="text-5xl md:text-6xl font-black mt-2 tracking-tight mb-6">
            <span style={{ color: '#4285F4' }}>{profile?.name ? profile.name.split(' ')[0].charAt(0).toUpperCase() + profile.name.split(' ')[0].slice(1).toLowerCase() : ''}</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/sales/quotations"
              className="inline-flex items-center justify-start gap-3 bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 transition-colors font-medium w-full sm:w-auto text-sm"
            >
              <FileText size={18} />
              <span>New Quotation</span>
            </Link>
          </div>
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
    </div>
  )
}
