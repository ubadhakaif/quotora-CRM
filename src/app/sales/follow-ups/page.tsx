'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, Search, PhoneCall, CheckSquare, Clock, AlertTriangle, Calendar, Award } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface FollowUp {
  id: string
  created_at: string
  due_date: string
  status: string
  notes: string | null
  customer_id: string
  assigned_to: string
  outcome: string | null
  customers?: Customer | null
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  missed: 'bg-rose-50 text-rose-700 border-rose-200',
}

const outcomeLabels: Record<string, string> = {
  interested: 'Interested (Hot)',
  not_interested: 'Not Interested (Lost)',
  call_later: 'Call Later (Warm)',
  no_answer: 'No Answer (Cold)',
}

export default function SalesFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('pending') // pending, overdue, completed, all
  
  // Add Follow-up Form State
  const [fCustomerId, setFCustomerId] = useState('')
  const [fDueDate, setFDueDate] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Complete Follow-up Panel State
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [fOutcome, setFOutcome] = useState('interested')
  const [fOutcomeNotes, setFOutcomeNotes] = useState('')
  const [completing, setCompleting] = useState(false)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchData = async () => {
    if (!profile?.id) return
    setLoading(true)
    
    // Fetch employee's follow-ups and assigned customer list
    const [followUpsRes, customersRes] = await Promise.all([
      supabase
        .from('follow_ups')
        .select('*, customers(id, name, phone, email)')
        .eq('assigned_to', profile.id)
        .order('due_date', { ascending: true }),
      supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('assigned_to', profile.id)
        .eq('is_active', true)
        .order('name')
    ])

    if (followUpsRes.data) setFollowUps(followUpsRes.data as any)
    if (customersRes.data) setCustomers(customersRes.data)
    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile])

  const now = new Date()

  const handleOpenAdd = () => {
    setFCustomerId('')
    setFDueDate('')
    setFNotes('')
    setPanelOpen(true)
  }

  const handleCloseAdd = () => {
    setPanelOpen(false)
  }

  const handleScheduleFollowUp = async () => {
    if (!fCustomerId || !fDueDate || !profile) return
    setSaving(true)

    const dateStr = new Date(fDueDate).toISOString()
    const newFollowUp = {
      tenant_id: profile.tenant_id,
      branch_id: profile.branch_id,
      customer_id: fCustomerId,
      assigned_to: profile.id,
      due_date: dateStr,
      status: 'pending',
      notes: fNotes.trim() || null,
    }

    const { error } = await supabase.from('follow_ups').insert(newFollowUp)

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Follow-up scheduled successfully', 'success')
      handleCloseAdd()
      fetchData()
    }
    setSaving(false)
  }

  const handleCompleteFollowUp = async (followUp: FollowUp) => {
    if (!profile) return
    setCompleting(true)

    // Update follow up status
    const { error } = await supabase
      .from('follow_ups')
      .update({
        status: 'completed',
        outcome: fOutcome,
        notes: fOutcomeNotes.trim() || followUp.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', followUp.id)

    if (error) {
      addToast(error.message, 'error')
    } else {
      // Auto-update Customer Lead Status based on outcome
      let leadStatus = 'warm'
      if (fOutcome === 'interested') leadStatus = 'hot'
      else if (fOutcome === 'not_interested') leadStatus = 'lost'
      else if (fOutcome === 'call_later') leadStatus = 'warm'
      else if (fOutcome === 'no_answer') leadStatus = 'cold'

      await supabase
        .from('customers')
        .update({ lead_status: leadStatus })
        .eq('id', followUp.customer_id)

      // Sync active leads table as well
      await supabase
        .from('leads')
        .update({ status: leadStatus })
        .eq('customer_id', followUp.customer_id)

      // Create a CRM interaction log automatically
      const noteContent = `Follow-up completed. Outcome: ${outcomeLabels[fOutcome]}. ${fOutcomeNotes ? `Notes: ${fOutcomeNotes.trim()}` : ''}`
      await supabase.from('customer_notes').insert({
        tenant_id: profile.tenant_id,
        customer_id: followUp.customer_id,
        created_by: profile.id,
        content: noteContent,
        note_type: 'call'
      })

      addToast(`Follow-up marked completed. CRM lead status set to: ${leadStatus.toUpperCase()}`, 'success')
      setCompletingId(null)
      setFOutcomeNotes('')
      fetchData()
    }
    setCompleting(false)
  }

  const filtered = followUps.filter(f => {
    const custName = f.customers?.name || ''
    const matchSearch = custName.toLowerCase().includes(search.toLowerCase())
    
    let matchFilter = true
    const dueDate = new Date(f.due_date)
    
    if (filter === 'pending') {
      matchFilter = f.status === 'pending' && dueDate >= now
    } else if (filter === 'overdue') {
      matchFilter = f.status === 'pending' && dueDate < now
    } else if (filter === 'completed') {
      matchFilter = f.status === 'completed'
    } else {
      matchFilter = true
    }

    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        
        <div className="flex gap-2 shrink-0">
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none font-medium"
          >
            <option value="all">All Follow-ups</option>
            <option value="pending">Upcoming Pending</option>
            <option value="overdue">Overdue Alerts</option>
            <option value="completed">Completed Logs</option>
          </select>

          <button
            onClick={panelOpen ? handleCloseAdd : handleOpenAdd}
            className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors"
          >
            {panelOpen ? <X size={18} /> : <Plus size={18} />}
            {panelOpen ? 'Close panel' : 'Schedule follow-up'}
          </button>
        </div>
      </div>

      {/* Schedule Follow-up Panel */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 space-y-6">
          <div>
            <h3 className="text-lg text-slate-900 pl-2">Schedule Customer Follow-up</h3>
            <p className="text-sm text-slate-500 pl-2 mt-1">Setup a future phone call or visit reminder for one of your assigned customer profiles.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Select Customer</label>
                <select
                  value={fCustomerId}
                  onChange={e => setFCustomerId(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="">-- Choose Assigned Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Follow-up Due Date & Time</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={fDueDate}
                    onChange={e => setFDueDate(e.target.value)}
                    className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Pre-Call Action Notes / Objectives</label>
              <textarea
                value={fNotes}
                onChange={e => setFNotes(e.target.value)}
                placeholder="Mention customer requirements or purpose of call..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCloseAdd}
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              onClick={handleScheduleFollowUp}
              disabled={!fCustomerId || !fDueDate || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Scheduling...' : 'Schedule call'}
            </button>
          </div>
        </div>
      )}

      {/* Follow-ups List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-[2.5rem]" />)}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(f => {
              const dueDate = new Date(f.due_date)
              const isOverdue = f.status === 'pending' && dueDate < now
              const isCompleting = completingId === f.id
              
              return (
                <div key={f.id} className="transition-colors">
                  <div className={`p-6 md:p-8 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors ${isOverdue ? 'bg-rose-50/20' : 'hover:bg-slate-50'}`}>
                    
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-600' : f.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {f.status === 'completed' ? <CheckSquare size={20} /> : isOverdue ? <AlertTriangle size={20} /> : <PhoneCall size={20} />}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-slate-900 font-medium truncate text-lg">{f.customers?.name}</p>
                          <span className={`text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5 border ${statusColors[f.status] || ''}`}>
                            {f.status}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5 border bg-rose-50 text-rose-700 border-rose-200">
                              Overdue Alert
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                          <span>{f.customers?.phone || 'No phone'}</span>
                          {f.notes && <span className="truncate max-w-[250px]" title={f.notes}>🎯 {f.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
                      <div className="space-y-1 md:text-right">
                        <p className="text-sm text-slate-900 font-medium flex items-center md:justify-end gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {dueDate.toLocaleString()}
                        </p>
                        {f.status === 'completed' && f.outcome && (
                          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">
                            Outcome: {outcomeLabels[f.outcome]}
                          </p>
                        )}
                      </div>

                      {f.status === 'pending' && !isCompleting && (
                        <button
                          onClick={() => setCompletingId(f.id)}
                          className="bg-slate-900 text-white text-xs font-semibold rounded-full px-6 py-3 hover:bg-slate-800 transition-colors w-full sm:w-auto"
                        >
                          Complete Call
                        </button>
                      )}

                      {isCompleting && (
                        <button
                          onClick={() => setCompletingId(null)}
                          className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-full px-6 py-3 hover:bg-slate-50 transition-colors w-full sm:w-auto"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Completing Outcome Panel */}
                  {isCompleting && (
                    <div className="p-6 md:p-10 px-6 md:px-12 bg-slate-50/50 border-t border-b border-slate-100 space-y-5">
                      <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                        <Calendar size={18} className="text-slate-400" />
                        <h4 className="text-sm font-semibold text-slate-900">Record Call Outcome & Update CRM</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-slate-600 pl-4">Call Outcome Response</label>
                          <select
                            value={fOutcome}
                            onChange={e => setFOutcome(e.target.value)}
                            className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 text-sm focus:border-slate-900 outline-none appearance-none"
                          >
                            <option value="interested">Interested (Update lead to HOT)</option>
                            <option value="call_later">Call Later (Update lead to WARM)</option>
                            <option value="no_answer">No Answer (Update lead to COLD)</option>
                            <option value="not_interested">Not Interested (Update lead to LOST)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-slate-600 pl-4">Outcome Discussion Notes</label>
                          <input
                            type="text"
                            value={fOutcomeNotes}
                            onChange={e => setFOutcomeNotes(e.target.value)}
                            placeholder="Add brief details about the conversation..."
                            className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 text-sm focus:border-slate-900 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setCompletingId(null)}
                          className="bg-white border border-slate-200 text-slate-600 rounded-full px-6 py-3 text-xs font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleCompleteFollowUp(f)}
                          disabled={completing}
                          className="bg-slate-900 text-white rounded-full px-8 py-3 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                          {completing ? 'Recording...' : 'Complete & Update CRM'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="p-16 text-center text-slate-500">No scheduled follow-up logs found for current filter.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
