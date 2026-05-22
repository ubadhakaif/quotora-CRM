'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Calendar, Clock, ArrowLeft, User, ShieldAlert, Edit2, Check, Eye } from 'lucide-react'
import Link from 'next/link'

interface Profile {
  id: string
  name: string
  email: string
  role: string
}

interface AttendanceRecord {
  id: string
  date: string
  check_in: string
  check_out: string | null
  status: 'present' | 'absent' | 'half_day' | 'on_leave'
  profile_id: string
  profiles?: Profile | null
}

export default function BranchAttendancePage() {
  const [activeTab, setActiveTab] = useState<'team' | 'personal'>('team')
  const [teamLogs, setTeamLogs] = useState<AttendanceRecord[]>([])
  const [personalLogs, setPersonalLogs] = useState<AttendanceRecord[]>([])
  const [branchStaff, setBranchStaff] = useState<Profile[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  // State for manual attendance adjustment modal/fields
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<'present' | 'absent' | 'half_day' | 'on_leave'>('present')
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    if (!profile?.branch_id) return
    setLoading(true)

    // 1. Fetch branch staff profiles
    const staffRes = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('branch_id', profile.branch_id)
      .eq('role', 'employee')

    if (staffRes.data) setBranchStaff(staffRes.data)

    // 2. Fetch today's team logs
    let query = supabase
      .from('employee_attendance')
      .select('*, profiles(id, name, email, role)')
      .eq('branch_id', profile.branch_id)
      .neq('profile_id', profile.id) // Exclude current user (branch manager)
      .order('date', { ascending: false })

    if (selectedStaffId !== 'all') {
      query = query.eq('profile_id', selectedStaffId)
    }

    const logsRes = await query

    if (logsRes.data) setTeamLogs(logsRes.data as any[])

    // 3. Fetch manager's personal logs
    const personalRes = await supabase
      .from('employee_attendance')
      .select('*')
      .eq('profile_id', profile.id)
      .order('date', { ascending: false })

    if (personalRes.data) setPersonalLogs(personalRes.data as any[])

    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile, selectedStaffId])

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
      addToast('Attendance log updated successfully', 'success')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Attendance Desk</h2>
          <p className="text-xs text-slate-500">Track and manage branch employee rosters and work hours.</p>
        </div>

        {/* Tab Controls */}
        <div className="bg-slate-100 p-1 rounded-full flex self-start sm:self-auto border border-slate-200">
          <button
            onClick={() => setActiveTab('team')}
            className={`rounded-full px-6 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Branch Team
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`rounded-full px-6 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            My Logs
          </button>
        </div>
      </div>

      {activeTab === 'team' && (
        <div className="space-y-4">
          {/* Filtering controls */}
          <div className="bg-white border border-slate-200 rounded-[1.5rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Filter Staff Member</span>
            </div>
            <select
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
              className="w-full sm:w-64 rounded-full py-2.5 px-4 bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white transition-all outline-none"
            >
              <option value="all">-- All Branch Staff --</option>
              {branchStaff.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role === 'employee' ? 'Sales Exec' : staff.role})
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[1.5rem]" />)}
            </div>
          ) : teamLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
              No employee attendance records found.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
              <div className="divide-y divide-slate-100">
                {teamLogs.map(log => {
                  const isEditing = editingId === log.id
                  return (
                    <div
                      key={log.id}
                      className="p-6 md:px-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:bg-slate-50 transition-all text-xs"
                    >
                      {/* Left: Employee Info */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                          {log.profiles?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{log.profiles?.name || 'Unspecified staff'}</p>
                          <p className="text-[10px] text-slate-400">{log.profiles?.email}</p>
                        </div>
                      </div>

                      {/* Middle: Shift log data OR editing inputs */}
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
                            <p className="font-semibold text-slate-800">{new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-medium">Check-In</p>
                            <p className="font-semibold text-slate-800">
                              {new Date(log.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-medium">Check-Out</p>
                            <p className="font-semibold text-slate-800">
                              {log.check_out
                                ? new Date(log.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                                : 'Active'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 font-medium">Duration</p>
                            <p className="font-semibold text-slate-800">
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
                        <div className="shrink-0 flex items-center justify-end gap-2">
                          <Link
                            href={`/branch/attendance/${log.id}`}
                            className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                            title="View check-in verification details"
                          >
                            <Eye size={13} />
                          </Link>
                          <button
                            onClick={() => handleEditClick(log)}
                            className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                            title="Edit log details"
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
      )}

      {activeTab === 'personal' && (
        <div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[1.5rem]" />)}
            </div>
          ) : personalLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
              No personal attendance logs found. Use the check-in button on the dashboard to register.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
              <div className="divide-y divide-slate-100">
                {personalLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {new Date(log.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          My Attendance Record
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 items-center text-xs">
                      <div>
                        <p className="text-slate-400">Check-In</p>
                        <p className="font-semibold text-slate-800">
                          {new Date(log.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Check-Out</p>
                        <p className="font-semibold text-slate-800">
                          {log.check_out
                            ? new Date(log.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                            : 'Active'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Hours</p>
                        <p className="font-semibold text-slate-800">
                          {calculateHours(log.check_in, log.check_out)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Status</p>
                        <span
                          className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
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

                    <div className="shrink-0 flex items-center justify-end">
                      <Link
                        href={`/branch/attendance/${log.id}`}
                        className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                        title="View my check-in verification details"
                      >
                        <Eye size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
