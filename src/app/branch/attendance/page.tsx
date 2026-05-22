'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Calendar, Clock, ArrowLeft, User, ShieldAlert, Edit2, Check, Eye, X } from 'lucide-react'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'

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

  // Pagination State
  const [teamCurrentPage, setTeamCurrentPage] = useState(1)
  const [teamRowsPerPage, setTeamRowsPerPage] = useState(10)

  const [personalCurrentPage, setPersonalCurrentPage] = useState(1)
  const [personalRowsPerPage, setPersonalRowsPerPage] = useState(10)

  // Reset page parameters on filter / tab changes
  useEffect(() => {
    setTeamCurrentPage(1)
    setPersonalCurrentPage(1)
  }, [selectedStaffId, activeTab])

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
            <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                    {teamLogs.slice((teamCurrentPage - 1) * teamRowsPerPage, teamCurrentPage * teamRowsPerPage).map(log => {
                      const isEditing = editingId === log.id
                      const empName = log.profiles?.name || 'Unspecified staff'
                      const empEmail = log.profiles?.email || ''

                      if (isEditing) {
                        return (
                          <tr key={log.id} className="bg-slate-50/40">
                            {/* Employee Info */}
                            <td className="py-4 px-6 md:px-8 min-w-[200px]">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold">
                                  {empName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{empName}</p>
                                  <p className="text-[11px] text-slate-500 font-medium">{empEmail}</p>
                                </div>
                              </div>
                            </td>

                            {/* Log Date (readonly) */}
                            <td className="py-4 px-6 min-w-[120px] text-slate-700 font-medium">
                              {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>

                            {/* Check-In Edit */}
                            <td className="py-4 px-6 min-w-[180px]">
                              <input
                                type="datetime-local"
                                value={editCheckIn}
                                onChange={e => setEditCheckIn(e.target.value)}
                                className="w-full rounded-xl py-1.5 px-3 bg-white border border-slate-200 text-xs text-slate-800 focus:border-slate-900 transition-all outline-none"
                              />
                            </td>

                            {/* Check-Out Edit */}
                            <td className="py-4 px-6 min-w-[180px]">
                              <input
                                type="datetime-local"
                                value={editCheckOut}
                                onChange={e => setEditCheckOut(e.target.value)}
                                className="w-full rounded-xl py-1.5 px-3 bg-white border border-slate-200 text-xs text-slate-800 focus:border-slate-900 transition-all outline-none"
                              />
                            </td>

                            {/* Duration (calculating / placeholder) */}
                            <td className="py-4 px-6 min-w-[100px] text-slate-400 font-medium">
                              —
                            </td>

                            {/* Status Edit */}
                            <td className="py-4 px-6 min-w-[130px]">
                              <select
                                value={editStatus}
                                onChange={e => setEditStatus(e.target.value as any)}
                                className="w-full rounded-xl py-1.5 px-3 bg-white border border-slate-200 text-xs text-slate-800 focus:border-slate-900 transition-all outline-none"
                              >
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="half_day">Half Day</option>
                                <option value="on_leave">On Leave</option>
                              </select>
                            </td>

                            {/* Actions Save/Cancel */}
                            <td className="py-4 px-6 md:pr-8 text-right min-w-[120px]">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleSaveEdit(log.id)}
                                  disabled={saving}
                                  className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title={saving ? 'Saving...' : 'Save Changes'}
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="Cancel Edit"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Employee Info */}
                          <td className="py-5 px-6 md:px-8 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
                                {empName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{empName}</p>
                                <p className="text-[11px] text-slate-500 font-medium">{empEmail}</p>
                              </div>
                            </div>
                          </td>

                          {/* Log Date */}
                          <td className="py-5 px-6 min-w-[120px] text-slate-700 font-medium">
                            {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>

                          {/* Check-In */}
                          <td className="py-5 px-6 min-w-[140px] text-slate-700 font-medium">
                            {new Date(log.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                          </td>

                          {/* Check-Out */}
                          <td className="py-5 px-6 min-w-[140px] text-slate-700 font-medium">
                            {log.check_out
                              ? new Date(log.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                              : <span className="text-slate-400 font-semibold text-xs">Active</span>}
                          </td>

                          {/* Duration */}
                          <td className="py-5 px-6 min-w-[110px] text-slate-700 font-medium">
                            {calculateHours(log.check_in, log.check_out)}
                          </td>

                          {/* Status */}
                          <td className="py-5 px-6 min-w-[120px]">
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
                          </td>

                          {/* Actions */}
                          <td className="py-5 px-6 md:pr-8 text-right min-w-[120px]">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/branch/attendance/${log.id}`}
                                className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-full transition-all cursor-pointer"
                                title="View check-in verification details"
                              >
                                <Eye size={13} />
                              </Link>
                              <button
                                onClick={() => handleEditClick(log)}
                                className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-full transition-all cursor-pointer"
                                title="Edit log details"
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={teamCurrentPage}
                totalItems={teamLogs.length}
                rowsPerPage={teamRowsPerPage}
                onPageChange={setTeamCurrentPage}
                onRowsPerPageChange={(rows) => {
                  setTeamRowsPerPage(rows)
                  setTeamCurrentPage(1)
                }}
              />
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
            <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-5 px-6 md:px-8">Date</th>
                      <th className="py-5 px-6">Check-In</th>
                      <th className="py-5 px-6">Check-Out</th>
                      <th className="py-5 px-6">Duration</th>
                      <th className="py-5 px-6">Status</th>
                      <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {personalLogs.slice((personalCurrentPage - 1) * personalRowsPerPage, personalCurrentPage * personalRowsPerPage).map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Date */}
                        <td className="py-5 px-6 md:px-8 min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0">
                              <Clock size={15} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {new Date(log.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium">My Attendance Record</p>
                            </div>
                          </div>
                        </td>

                        {/* Check-In */}
                        <td className="py-5 px-6 min-w-[140px] text-slate-700 font-medium">
                          {new Date(log.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                        </td>

                        {/* Check-Out */}
                        <td className="py-5 px-6 min-w-[140px] text-slate-700 font-medium">
                          {log.check_out
                            ? new Date(log.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                            : <span className="text-slate-400 font-semibold text-xs">Active</span>}
                        </td>

                        {/* Duration */}
                        <td className="py-5 px-6 min-w-[110px] text-slate-700 font-medium">
                          {calculateHours(log.check_in, log.check_out)}
                        </td>

                        {/* Status */}
                        <td className="py-5 px-6 min-w-[120px]">
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
                        </td>

                        {/* Actions */}
                        <td className="py-5 px-6 md:pr-8 text-right min-w-[120px]">
                          <div className="flex items-center justify-end">
                            <Link
                                href={`/branch/attendance/${log.id}`}
                                className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-full transition-all cursor-pointer"
                                title="View my check-in verification details"
                            >
                              <Eye size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={personalCurrentPage}
                totalItems={personalLogs.length}
                rowsPerPage={personalRowsPerPage}
                onPageChange={setPersonalCurrentPage}
                onRowsPerPageChange={(rows) => {
                  setPersonalRowsPerPage(rows)
                  setPersonalCurrentPage(1)
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
