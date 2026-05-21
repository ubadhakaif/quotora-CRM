'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Calendar, Clock, ArrowLeft, Hourglass, Award } from 'lucide-react'
import Link from 'next/link'

interface AttendanceRecord {
  id: string
  date: string
  check_in: string
  check_out: string | null
  status: 'present' | 'absent' | 'half_day' | 'on_leave'
  notes: string | null
}

export default function SalesAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchAttendance() {
      if (!profile?.id) return
      setLoading(true)
      const { data, error } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('profile_id', profile.id)
        .order('date', { ascending: false })

      if (data) setRecords(data)
      setLoading(false)
    }

    if (profile) {
      fetchAttendance()
    }
  }, [profile])

  const calculateHours = (inStr: string, outStr: string | null) => {
    if (!outStr) return 'Active'
    const diff = new Date(outStr).getTime() - new Date(inStr).getTime()
    const hours = diff / (1000 * 60 * 60)
    return `${hours.toFixed(2)} hrs`
  }

  // Calculate statistics
  const totalPresent = records.filter(r => r.status === 'present' || r.status === 'half_day').length
  const totalHours = records.reduce((acc, r) => {
    if (r.check_in && r.check_out) {
      return acc + (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60)
    }
    return acc
  }, 0)
  const avgHours = totalPresent > 0 ? (totalHours / totalPresent).toFixed(2) : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-950">My Attendance Logs</h2>
        <p className="text-xs text-slate-500">View and track your daily check-in history and work duration.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-100">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Days Tracked</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{records.length} Days</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-100">
            <Award size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Present Days</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalPresent} Days</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-100">
            <Hourglass size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Avg Shift Length</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{avgHours} hrs</p>
          </div>
        </div>
      </div>

      {/* Attendance History List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-20 rounded-[1.5rem]" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No attendance records found yet. Use the check-in button on the dashboard to start!
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {records.map(record => (
              <div
                key={record.id}
                className="p-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-all text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">
                      {new Date(record.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <span className="text-[10px] uppercase font-extrabold text-slate-400">
                      Record Date
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 items-center">
                  <div>
                    <p className="text-xs text-slate-400">Check-In</p>
                    <p className="font-semibold text-slate-800">
                      {new Date(record.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Check-Out</p>
                    <p className="font-semibold text-slate-800">
                      {record.check_out
                        ? new Date(record.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                        : 'Active'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Hours</p>
                    <p className="font-semibold text-slate-800">
                      {calculateHours(record.check_in, record.check_out)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Status</p>
                    <span
                      className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                        record.status === 'present'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : record.status === 'half_day'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
