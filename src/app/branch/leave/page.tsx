'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { CalendarDays, Check, X, Plus, Search } from 'lucide-react'

interface LeaveRequest {
  id: string
  profile_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: string
  review_note: string | null
  reviewed_at: string | null
  created_at: string
  profiles?: { name: string; email: string } | null
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

export default function BranchLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [activeReview, setActiveReview] = useState<string | null>(null)

  // Apply leave form
  const [showApply, setShowApply] = useState(false)
  const [applyType, setApplyType] = useState('casual')
  const [applyStart, setApplyStart] = useState('')
  const [applyEnd, setApplyEnd] = useState('')
  const [applyReason, setApplyReason] = useState('')
  const [applying, setApplying] = useState(false)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchRequests = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, profiles!profile_id(name, email), reviewer:profiles!reviewed_by(name)')
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

  const handleApply = async () => {
    if (!applyStart || !applyEnd || !profile) return
    setApplying(true)
    const { error } = await supabase.from('leave_requests').insert({
      tenant_id: profile.tenant_id,
      branch_id: profile.branch_id,
      profile_id: profile.id,
      leave_type: applyType,
      start_date: applyStart,
      end_date: applyEnd,
      reason: applyReason || null,
    })
    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Leave request submitted', 'success')
      setShowApply(false)
      setApplyType('casual')
      setApplyStart('')
      setApplyEnd('')
      setApplyReason('')
      fetchRequests()
    }
    setApplying(false)
  }

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

  const handleCancel = async (id: string) => {
    setActionLoading(id)
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Leave request cancelled', 'success')
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

  const filtered = requests.filter(r => {
    const matchesSearch = getProfileName(r).toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const myRequests = filtered.filter(r => r.profile_id === profile?.id)
  const teamRequests = filtered.filter(r => r.profile_id !== profile?.id)

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <button
          onClick={() => setShowApply(!showApply)}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors cursor-pointer w-full sm:w-auto shrink-0"
        >
          {showApply ? <X size={18} /> : <Plus size={18} />}
          {showApply ? 'Close' : 'Apply for leave'}
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
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

      {/* Apply Leave Form */}
      {showApply && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">Apply for Leave</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Leave type</label>
              <select
                value={applyType}
                onChange={e => setApplyType(e.target.value)}
                className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
              >
                {Object.entries(LEAVE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div />
            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Start date</label>
              <input
                type="date"
                value={applyStart}
                onChange={e => setApplyStart(e.target.value)}
                className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">End date</label>
              <input
                type="date"
                value={applyEnd}
                min={applyStart}
                onChange={e => setApplyEnd(e.target.value)}
                className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm text-slate-600 pl-4">Reason (optional)</label>
              <textarea
                value={applyReason}
                onChange={e => setApplyReason(e.target.value)}
                rows={2}
                placeholder="Brief reason for leave..."
                className="w-full rounded-[1.5rem] py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none resize-none"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setShowApply(false)} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial cursor-pointer">Cancel</button>
            <button onClick={handleApply} disabled={!applyStart || !applyEnd || applying} className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto cursor-pointer font-semibold text-sm">
              {applying ? 'Submitting...' : 'Submit request'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-[2rem]" />)}</div>
      ) : (
        <>
          {/* My Requests */}
          {myRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pl-2">My Requests</h3>
              {myRequests.map(r => (
                <LeaveCard
                  key={r.id}
                  request={r}
                  profileName={getProfileName(r)}
                  getDays={getDays}
                  isMine
                  onCancel={handleCancel}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}

          {/* Team Requests */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 pl-2">Team Requests</h3>
            {teamRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[2rem] p-10 text-center">
                <CalendarDays className="mx-auto text-slate-300 mb-3" size={36} />
                <p className="text-sm text-slate-500">No team leave requests found.</p>
              </div>
            ) : (
              teamRequests.map(r => (
                <div key={r.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 text-sm font-bold shrink-0">
                        {getProfileName(r).charAt(0).toUpperCase()}
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{getProfileName(r)}</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                      {r.status}
                    </span>
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
                          <button onClick={() => { setActiveReview(r.id); setReviewNote('') }} className="bg-slate-900 text-white rounded-full px-6 py-3 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer">Review</button>
                        ) : (
                          <>
                            <button onClick={() => handleAction(r.id, 'approved')} disabled={actionLoading === r.id} className="bg-emerald-600 text-white rounded-full px-5 py-3 text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"><Check size={14} /> Approve</button>
                            <button onClick={() => handleAction(r.id, 'rejected')} disabled={actionLoading === r.id} className="bg-red-600 text-white rounded-full px-5 py-3 text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"><X size={14} /> Reject</button>
                            <button onClick={() => { setActiveReview(null); setReviewNote('') }} className="bg-white border border-slate-200 text-slate-600 rounded-full px-5 py-3 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function LeaveCard({ request: r, profileName, getDays, isMine, onCancel, actionLoading }: {
  request: LeaveRequest
  profileName: string
  getDays: (s: string, e: string) => number
  isMine?: boolean
  onCancel?: (id: string) => void
  actionLoading: string | null
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-900">{LEAVE_TYPE_LABELS[r.leave_type] || r.leave_type}</span>
        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
          {r.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-6 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Duration</span>
          <span className="text-slate-800 font-semibold">
            {new Date(r.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {r.start_date !== r.end_date && ` — ${new Date(r.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            {' '}({getDays(r.start_date, r.end_date)} day{getDays(r.start_date, r.end_date) > 1 ? 's' : ''})
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">Applied</span>
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
        <p className="text-xs text-slate-600 bg-slate-50 rounded-[1.5rem] p-4 border border-slate-100">{r.reason}</p>
      )}
      {r.review_note && (
        <p className="text-xs text-slate-600 bg-slate-50 rounded-[1.5rem] p-4 border border-slate-100">
          <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block mb-1">Review note</span>
          {r.review_note}
        </p>
      )}
      {isMine && r.status === 'pending' && onCancel && (
        <button
          onClick={() => onCancel(r.id)}
          disabled={actionLoading === r.id}
          className="bg-white border border-slate-200 text-slate-600 rounded-full px-5 py-3 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel Request
        </button>
      )}
    </div>
  )
}
