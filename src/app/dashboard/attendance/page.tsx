'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Calendar, Clock, ArrowLeft, Filter, Users, ShieldCheck, Edit2, Check, Landmark } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  branch_id: string | null
}

interface Branch {
  id: string
  name: string
}

interface AttendanceRecord {
  id: string
  date: string
  check_in: string
  check_out: string | null
  status: 'present' | 'absent' | 'half_day' | 'on_leave'
  profile_id: string
  branch_id: string | null
  profiles?: Profile | null
}

export default function DealerAdminAttendancePage() {
  const [logs, setLogs] = useState<AttendanceRecord[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [staffList, setStaffList] = useState<Profile[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  // State for manual adjustments
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<'present' | 'absent' | 'half_day' | 'on_leave'>('present')
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    if (!profile?.tenant_id) return
    setLoading(true)

    // 1. Fetch all branches for this tenant
    const branchRes = await supabase
      .from('branches')
      .select('id, name')
      .eq('tenant_id', profile.tenant_id)
      .order('name')

    if (branchRes.data) setBranches(branchRes.data)

    // 2. Fetch all staff for this tenant
    const staffRes = await supabase
      .from('profiles')
      .select('id, name, email, role, branch_id')
      .eq('tenant_id', profile.tenant_id)
      .order('name')

    if (staffRes.data) setStaffList(staffRes.data)

    // 3. Fetch logs
    let query = supabase
      .from('employee_attendance')
      .select('*, profiles(id, name, email, role, branch_id)')
      .eq('tenant_id', profile.tenant_id)
      .order('date', { ascending: false })

    if (selectedBranchId !== 'all') {
      query = query.eq('branch_id', selectedBranchId)
    }
    if (selectedStaffId !== 'all') {
      query = query.eq('profile_id', selectedStaffId)
    }

    const logsRes = await query

    if (logsRes.data) setLogs(logsRes.data as any[])
    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile, selectedBranchId, selectedStaffId])

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingId(record.id)
    setEditStatus(record.status)
    setEditCheckIn(record.check_in ? new Date(record.check_in).toISOString().slice(0, 16) : '')
    setEditCheckOut(record.check_out ? new Date(record.check_out).toISOString().slice(0, 16) : '')
  }

  const handleSaveEdit = async (recordId: string) => {
    setSaving(true)
    const updatePayload = {
      status: editStatus,
      check_in: editCheckIn ? new Date(editCheckIn).toISOString() : null,
      check_out: editCheckOut ? new Date(editCheckOut).toISOString() : null,
    }

    const { error } = await supabase
      .from('employee_attendance')
      .update(updatePayload)
      .eq('id', recordId)

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Attendance record saved successfully', 'success')
      setEditingId(null)
      fetchData()
    }
    setSaving(false)
  }

  const calculateHours = (inStr: string, outStr: string | null) => {
    if (!outStr) return 'Active'
    const diff = new Date(outStr).getTime() - new Date(inStr).getTime()
    const hours = diff / (1000 * 60 * 60)
    return `${hours.toFixed(2)} hrs`
  }

  // Calculate statistics
  const totalDays = logs.length
  const totalPresent = logs.filter(l => l.status === 'present').length
  const totalOnLeave = logs.filter(l => l.status === 'on_leave').length
  const activeNow = logs.filter(l => l.check_in && !l.check_out).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2.5 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-950">Global Attendance Logbook</h2>
          <p className="text-xs text-slate-500">View, audit and correct employee rosters and check-in times across all branches.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Logs</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalDays} records</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Present Count</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalPresent} shifts</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">On-Shift Right Now</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{activeNow} Active</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Approved Leave</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalOnLeave} days</p>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Branch filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-wider flex items-center gap-1.5">
            <Landmark size={14} /> Filter by Branch
          </label>
          <select
            value={selectedBranchId}
            onChange={e => {
              setSelectedBranchId(e.target.value)
              setSelectedStaffId('all') // Reset employee filter on branch switch
            }}
            className="w-full rounded-full py-3 px-4 bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white transition-all outline-none"
          >
            <option value="all">-- All Dealership Branches --</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Staff filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 pl-1 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={14} /> Filter by Staff Member
          </label>
          <select
            value={selectedStaffId}
            onChange={e => setSelectedStaffId(e.target.value)}
            className="w-full rounded-full py-3 px-4 bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white transition-all outline-none"
          >
            <option value="all">-- All Staff Members --</option>
            {staffList
              .filter(s => selectedBranchId === 'all' || s.branch_id === selectedBranchId)
              .map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[1.5rem]" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No attendance records found with the selected filters.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {logs.map(log => {
              const isEditing = editingId === log.id
              const branchName = branches.find(b => b.id === log.profiles?.branch_id)?.name || 'Headquarters'
              return (
                <div
                  key={log.id}
                  className="p-6 md:px-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:bg-slate-50 transition-all text-xs"
                >
                  {/* Left: employee details */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                      {log.profiles?.name?.charAt(0) || 'E'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{log.profiles?.name || 'Unspecified staff'}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">{branchName} • {log.profiles?.role}</p>
                    </div>
                  </div>

                  {/* Middle: editable check-ins */}
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 pl-1 font-bold uppercase">Status</label>
                        <select
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value as any)}
                          className="w-full rounded-lg p-2 bg-white border border-slate-200 outline-none text-xs"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="half_day">Half Day</option>
                          <option value="on_leave">On Leave</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 pl-1 font-bold uppercase">Check-In</label>
                        <input
                          type="datetime-local"
                          value={editCheckIn}
                          onChange={e => setEditCheckIn(e.target.value)}
                          className="w-full rounded-lg p-2 bg-white border border-slate-200 outline-none text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 pl-1 font-bold uppercase">Check-Out</label>
                        <input
                          type="datetime-local"
                          value={editCheckOut}
                          onChange={e => setEditCheckOut(e.target.value)}
                          className="w-full rounded-lg p-2 bg-white border border-slate-200 outline-none text-xs"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveEdit(log.id)}
                        disabled={saving}
                        className="bg-slate-950 text-white rounded-lg p-2.5 flex items-center justify-center gap-1 hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <Check size={14} /> {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-8 gap-y-2 items-center flex-1 max-w-3xl">
                      <div>
                        <p className="text-slate-400 font-medium">Log Date</p>
                        <p className="font-semibold text-slate-850">{new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Check-In</p>
                        <p className="font-semibold text-slate-800">
                          {new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Check-Out</p>
                        <p className="font-semibold text-slate-800">
                          {log.check_out
                            ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Active'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Duration</p>
                        <p className="font-semibold text-slate-805">
                          {calculateHours(log.check_in, log.check_out)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Status</p>
                        <span
                          className={`inline-block text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                            log.status === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : log.status === 'half_day'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!isEditing && (
                    <div className="shrink-0 flex items-center justify-end">
                      <button
                        onClick={() => handleEditClick(log)}
                        className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                        title="Edit global logs"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
