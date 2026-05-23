'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Calendar, Clock, Filter, Users, ShieldCheck, Edit2, Check, Landmark, Eye } from 'lucide-react'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'

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

export function AttendanceTab() {
  const [logs, setLogs] = useState<AttendanceRecord[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [staffList, setStaffList] = useState<Profile[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page to 1 on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedBranchId, selectedStaffId])

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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-100">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Logs</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalDays} records</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-100">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Present Count</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalPresent} shifts</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-100">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">On-Shift Right Now</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{activeNow} Active</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-100">
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
            className="w-full rounded-full py-3 px-4 bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white transition-all outline-none cursor-pointer"
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
            className="w-full rounded-full py-3 px-4 bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white transition-all outline-none cursor-pointer"
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

      {/* Tabular logs Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[1.5rem]" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No attendance records found with the selected filters.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Employee</th>
                  <th className="py-5 px-6">Log Date</th>
                  <th className="py-5 px-6">Check-In</th>
                  <th className="py-5 px-6">Check-Out</th>
                  <th className="py-5 px-6">Duration</th>
                  <th className="py-5 px-6">Status</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(log => {
                  const isEditing = editingId === log.id
                  const branchName = branches.find(b => b.id === log.profiles?.branch_id)?.name || 'Headquarters'
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Employee Column */}
                      <td className="py-4 px-6 md:px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
                            {log.profiles?.name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{log.profiles?.name || 'Unspecified staff'}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{branchName} • {log.profiles?.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Log Date Column */}
                      <td className="py-4 px-6 text-slate-700 font-medium whitespace-nowrap">
                        {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Check-In Column */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editCheckIn}
                            onChange={e => setEditCheckIn(e.target.value)}
                            className="rounded-lg p-2 bg-white border border-slate-200 outline-none text-xs w-full max-w-[170px]"
                          />
                        ) : (
                          <p className="font-semibold text-slate-800">
                            {new Date(log.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                          </p>
                        )}
                      </td>

                      {/* Check-Out Column */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={editCheckOut}
                            onChange={e => setEditCheckOut(e.target.value)}
                            className="rounded-lg p-2 bg-white border border-slate-200 outline-none text-xs w-full max-w-[170px]"
                          />
                        ) : (
                          <p className="font-semibold text-slate-800">
                            {log.check_out
                              ? new Date(log.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                              : 'Active'}
                          </p>
                        )}
                      </td>

                      {/* Duration Column */}
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {calculateHours(log.check_in, log.check_out)}
                      </td>

                      {/* Status Column */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value as any)}
                            className="rounded-lg p-2 bg-white border border-slate-200 outline-none text-xs w-full max-w-[110px] cursor-pointer"
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="half_day">Half Day</option>
                            <option value="on_leave">On Leave</option>
                          </select>
                        ) : (
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
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 px-6 md:pr-8 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(log.id)}
                              disabled={saving}
                              className="bg-slate-900 text-white rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 hover:bg-slate-800 transition-colors cursor-pointer font-semibold"
                            >
                              <Check size={12} /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="bg-white border border-slate-200 text-slate-650 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors cursor-pointer font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/dashboard/attendance/${log.id}`}
                              className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                              title="View details"
                            >
                              <Eye size={13} />
                            </Link>
                            <button
                              onClick={() => handleEditClick(log)}
                              className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                              title="Edit global logs"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={logs.length}
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
