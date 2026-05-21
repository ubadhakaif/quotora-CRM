'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { CalendarDays, Plus, X } from 'lucide-react'

interface LeaveRequest {
  id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: string
  review_note: string | null
  reviewed_at: string | null
  created_at: string
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

export default function SalesLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showApply, setShowApply] = useState(false)
  const [applyType, setApplyType] = useState('casual')
  const [applyStart, setApplyStart] = useState('')
  const [applyEnd, setApplyEnd] = useState('')
  const [applyReason, setApplyReason] = useState('')
  const [applying, setApplying] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchRequests = async () => {
    if (!profile?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      addToast(error.message, 'error')
    } else if (data) {
      setRequests(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.id) fetchRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

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

  const handleCancel = async (id: string) => {
    setCancellingId(id)
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
    setCancellingId(null)
  }

  const getDays = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowApply(!showApply)}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors cursor-pointer w-full sm:w-auto"
        >
          {showApply ? <X size={18} /> : <Plus size={18} />}
          {showApply ? 'Close' : 'Apply for leave'}
        </button>
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

      {/* My Leave Requests */}
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-[2rem]" />)}</div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center">
          <CalendarDays className="mx-auto text-slate-300 mb-3" size={42} />
          <p className="text-sm text-slate-500 font-medium">No leave requests yet.</p>
          <p className="text-xs text-slate-400 mt-1">Apply for your first leave above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 space-y-3">
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
              {r.status === 'pending' && (
                <button
                  onClick={() => handleCancel(r.id)}
                  disabled={cancellingId === r.id}
                  className="bg-white border border-slate-200 text-slate-600 rounded-full px-5 py-3 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel Request
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
