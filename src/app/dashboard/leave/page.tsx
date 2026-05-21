'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { CalendarDays, Check, X, Clock, Search, Filter } from 'lucide-react'

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

export default function AdminLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [activeReview, setActiveReview] = useState<string | null>(null)

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

      {/* Requests List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-[2rem]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center">
          <CalendarDays className="mx-auto text-slate-300 mb-3" size={42} />
          <p className="text-sm text-slate-500 font-medium">No leave requests found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div
              key={r.id}
              className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 text-sm font-bold shrink-0">
                    {getProfileName(r).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{getProfileName(r)}</p>
                    <p className="text-[11px] text-slate-400">{getProfileEmail(r)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getBranchName(r) && (
                    <span className="text-[10px] bg-slate-50 text-slate-600 rounded-full px-3 py-1 border border-slate-200 font-semibold">
                      {getBranchName(r)}
                    </span>
                  )}
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                    {r.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Type</span>
                  <span className="text-slate-800 font-semibold">{LEAVE_TYPE_LABELS[r.leave_type] || r.leave_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Duration</span>
                  <span className="text-slate-800 font-semibold">
                    {new Date(r.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {r.start_date !== r.end_date && ` — ${new Date(r.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                    {' '}({getDays(r.start_date, r.end_date)} day{getDays(r.start_date, r.end_date) > 1 ? 's' : ''})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Applied on</span>
                  <span className="text-slate-800 font-semibold">
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {r.reviewer && (
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">
                      {r.status === 'approved' ? 'Approved by' : r.status === 'rejected' ? 'Rejected by' : 'Reviewed by'}
                    </span>
                    <span className="text-slate-800 font-semibold">{r.reviewer.name}</span>
                  </div>
                )}
              </div>

              {r.reason && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-[1.5rem] p-4 border border-slate-100">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">Reason</span>
                  {r.reason}
                </p>
              )}

              {r.review_note && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-[1.5rem] p-4 border border-slate-100">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">Review note</span>
                  {r.review_note}
                </p>
              )}

              {/* Action Buttons for pending */}
              {r.status === 'pending' && (
                <div className="pt-2 space-y-3">
                  {activeReview === r.id && (
                    <input
                      type="text"
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      placeholder="Optional review note..."
                      className="w-full rounded-full py-3 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                    />
                  )}
                  <div className="flex gap-2">
                    {activeReview !== r.id ? (
                      <button
                        onClick={() => { setActiveReview(r.id); setReviewNote('') }}
                        className="bg-slate-900 text-white rounded-full px-6 py-3 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAction(r.id, 'approved')}
                          disabled={actionLoading === r.id}
                          className="bg-emerald-600 text-white rounded-full px-5 py-3 text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'rejected')}
                          disabled={actionLoading === r.id}
                          className="bg-red-600 text-white rounded-full px-5 py-3 text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          <X size={14} /> Reject
                        </button>
                        <button
                          onClick={() => { setActiveReview(null); setReviewNote('') }}
                          className="bg-white border border-slate-200 text-slate-600 rounded-full px-5 py-3 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
