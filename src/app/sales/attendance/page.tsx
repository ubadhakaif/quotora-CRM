'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Calendar, Clock, ArrowLeft, Hourglass, Award } from 'lucide-react'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

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

  // Paginated Slicing
  const paginatedRecords = records.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

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

      {/* Attendance History Table */}
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
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Log Date</th>
                  <th className="py-5 px-6">Check-In</th>
                  <th className="py-5 px-6">Check-Out</th>
                  <th className="py-5 px-6">Duration</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map(record => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50/50 transition-colors text-sm"
                  >
                    <td className="py-5 px-6 md:px-8 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {new Date(record.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <span className="text-[10px] uppercase font-extrabold text-slate-500">
                            Record Date
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6 min-w-[140px] text-slate-700 font-medium">
                      {new Date(record.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                    </td>

                    <td className="py-5 px-6 min-w-[140px] text-slate-700 font-medium">
                      {record.check_out
                        ? new Date(record.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                        : <span className="text-slate-500 font-semibold text-xs">Active</span>}
                    </td>

                    <td className="py-5 px-6 min-w-[110px] text-slate-700 font-medium">
                      {calculateHours(record.check_in, record.check_out)}
                    </td>

                    <td className="py-5 px-6 md:pr-8 text-right min-w-[120px]">
                      <span
                        className={`inline-block text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                          record.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : record.status === 'half_day'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Unified Pagination Control */}
          <Pagination
            currentPage={currentPage}
            totalItems={records.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setRowsPerPage(rows)
              setCurrentPage(1)
            }}
          />
        </div>
      )}
    </div>
  )
}
