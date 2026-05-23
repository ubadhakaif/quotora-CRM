'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { CalendarDays, Check, X, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'

interface LeaveRequest {
  id: string
  profile_id: string
  branch_id: string | null
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: string
  review_note: string | null
  reviewed_at: string | null
  created_at: string
  profiles?: { name: string; email: string } | null
  branches?: { name: string } | null
  reviewer?: { name: string } | null
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  earned: 'Earned Leave',
  compensatory: 'Compensatory Off',
  other: 'Other',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
}

export function LeaveTab() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [activeReview, setActiveReview] = useState<string | null>(null)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page to 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchRequests = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, profiles!profile_id(name, email), reviewer:profiles!reviewed_by(name), branches(name)')
      .order('created_at', { ascending: false })

    if (error) {
      addToast(error.message, 'error')
    } else if (data) {
      setRequests(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setActionLoading(id)
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: action,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
      })
      .eq('id', id)

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast(`Leave request ${action}`, 'success')
      setActiveReview(null)
      setReviewNote('')
      fetchRequests()
    }
    setActionLoading(null)
  }

  const getDays = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const getProfileName = (r: LeaveRequest) => {
    if (r.profiles && typeof r.profiles === 'object' && 'name' in r.profiles) {
      return (r.profiles as { name: string }).name
    }
    return 'Unknown'
  }

  const getProfileEmail = (r: LeaveRequest) => {
    if (r.profiles && typeof r.profiles === 'object' && 'email' in r.profiles) {
      return (r.profiles as { email: string }).email
    }
    return ''
  }

  const getBranchName = (r: LeaveRequest) => {
    if (r.branches && typeof r.branches === 'object' && 'name' in r.branches) {
      return (r.branches as { name: string }).name
    }
    return null
  }

  const filtered = requests.filter(r => {
    const matchesSearch = getProfileName(r).toLowerCase().includes(search.toLowerCase()) ||
      getProfileEmail(r).toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5">
          <p className="text-xs text-slate-500">Total requests</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5">
          <p className="text-xs text-amber-600 font-semibold">Pending</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5">
          <p className="text-xs text-emerald-600 font-semibold">Approved</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{requests.filter(r => r.status === 'approved').length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5">
          <p className="text-xs text-red-600 font-semibold">Rejected</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{requests.filter(r => r.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by employee name or email..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-5 py-3 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap capitalize ${
                statusFilter === s
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[2rem]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center">
          <CalendarDays className="mx-auto text-slate-300 mb-3" size={42} />
          <p className="text-sm text-slate-500 font-medium">No leave requests found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Employee</th>
                  <th className="py-5 px-6">Leave Type</th>
                  <th className="py-5 px-6">Duration</th>
                  <th className="py-5 px-6">Date Range</th>
                  <th className="py-5 px-6">Reason / Notes</th>
                  <th className="py-5 px-6">Status</th>
                  <th className="py-5 px-6">Reviewed By</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(r => {
                  const employeeName = getProfileName(r)
                  const employeeEmail = getProfileEmail(r)
                  const branchName = getBranchName(r)
                  
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        {/* Employee */}
                        <td className="py-5 px-6 md:px-8 min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                              {employeeName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{employeeName}</p>
                              <p className="text-[11px] text-slate-400">{employeeEmail}</p>
                              {branchName && (
                                <span className="text-[9px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 mt-0.5 inline-block font-semibold">
                                  {branchName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Leave Type */}
                        <td className="py-5 px-6 min-w-[120px] font-semibold text-slate-800">
                          {LEAVE_TYPE_LABELS[r.leave_type] || r.leave_type}
                        </td>

                        {/* Duration */}
                        <td className="py-5 px-6 min-w-[100px] text-slate-700">
                          {getDays(r.start_date, r.end_date)} day{getDays(r.start_date, r.end_date) > 1 ? 's' : ''}
                        </td>

                        {/* Date Range */}
                        <td className="py-5 px-6 min-w-[160px] text-slate-700">
                          <p className="font-medium">
                            {new Date(r.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {r.start_date !== r.end_date && ` — ${new Date(r.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Applied: {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </td>

                        {/* Reason / Review Notes */}
                        <td className="py-5 px-6 min-w-[200px]">
                          <div className="space-y-1 max-w-[220px]">
                            {r.reason && (
                              <p className="text-xs text-slate-600 truncate" title={r.reason}>
                                <span className="font-semibold text-slate-400 text-[10px] uppercase block">Reason:</span>
                                {r.reason}
                              </p>
                            )}
                            {r.review_note && (
                              <p className="text-xs text-slate-600 truncate" title={r.review_note}>
                                <span className="font-semibold text-slate-400 text-[10px] uppercase block">Review Note:</span>
                                {r.review_note}
                              </p>
                            )}
                            {!r.reason && !r.review_note && (
                              <span className="text-xs text-slate-400 italic">—</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-5 px-6 min-w-[110px]">
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                            {r.status}
                          </span>
                        </td>

                        {/* Reviewed By */}
                        <td className="py-5 px-6 min-w-[120px] text-slate-700 font-medium">
                          {r.reviewer ? r.reviewer.name : <span className="text-slate-400 italic">—</span>}
                        </td>

                        {/* Actions */}
                        <td className="py-5 px-6 md:pr-8 text-right min-w-[120px]">
                          {r.status === 'pending' && (
                            <div className="flex justify-end">
                              {activeReview !== r.id ? (
                                <button
                                  onClick={() => { setActiveReview(r.id); setReviewNote('') }}
                                  className="bg-slate-900 text-white rounded-full px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  Review
                                </button>
                              ) : (
                                <span className="text-xs font-bold text-slate-400">Reviewing...</span>
                              )}
                            </div>
                          )}
                          {r.status !== 'pending' && (
                            <span className="text-xs text-slate-400 italic">Completed</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable review pane inside table row */}
                      {activeReview === r.id && (
                        <tr key={`${r.id}-review`} className="bg-slate-50/40">
                          <td colSpan={8} className="py-4 px-6 md:px-8">
                            <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
                              <input
                                type="text"
                                value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)}
                                placeholder="Optional review note..."
                                className="flex-1 rounded-full py-2.5 px-5 bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
                              />
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleAction(r.id, 'approved')}
                                  disabled={actionLoading === r.id}
                                  className="bg-emerald-600 text-white rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  onClick={() => handleAction(r.id, 'rejected')}
                                  disabled={actionLoading === r.id}
                                  className="bg-red-600 text-white rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                >
                                  <X size={12} /> Reject
                                </button>
                                <button
                                  onClick={() => { setActiveReview(null); setReviewNote('') }}
                                  className="bg-white border border-slate-200 text-slate-600 rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
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
