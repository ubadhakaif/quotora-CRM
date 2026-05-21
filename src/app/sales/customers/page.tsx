'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, UserCircle, Search, Phone, Mail, MessageSquare, Clipboard, ArrowRight, Check } from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  lead_status: string
  source: string
  assigned_to: string | null
  branch_id: string | null
  created_at: string
}

interface CustomerNote {
  id: string
  content: string
  note_type: string
  created_at: string
  created_by: string
  profiles?: { name: string } | null
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  hot: 'bg-rose-50 text-rose-700 border-rose-200',
  warm: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-slate-100 text-slate-700 border-slate-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-400 border-slate-200',
}

const typeIcons: Record<string, string> = {
  call: '📞',
  visit: '🚗',
  email: '✉️',
  general: '📝',
}

export default function SalesCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Add Customer Form State
  const [fName, setFName] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fSource, setFSource] = useState('walk-in')
  const [fStatus, setFStatus] = useState('new')

  // Expanded/Edit Customer State
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editSource, setEditSource] = useState('walk-in')
  const [editStatus, setEditStatus] = useState('new')

  // Notes State
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [noteSaving, setNoteSaving] = useState(false)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchCustomers = async () => {
    if (!profile) return
    setLoading(true)
    // Employees can see branch customers, but let's prioritize ones assigned to them, and show other branch customers too
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) addToast(error.message, 'error')
    else if (data) setCustomers(data)
    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchCustomers()
    }
  }, [profile])

  const fetchNotes = async (customerId: string) => {
    setNotesLoading(true)
    const { data, error } = await supabase
      .from('customer_notes')
      .select('*, profiles(name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (data) setNotes(data as any)
    setNotesLoading(false)
  }

  const handleToggleExpand = (c: Customer) => {
    if (expandedId === c.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(c.id)
    setEditName(c.name)
    setEditPhone(c.phone || '')
    setEditEmail(c.email || '')
    setEditSource(c.source || 'walk-in')
    setEditStatus(c.lead_status || 'new')
    setNoteContent('')
    setNoteType('general')
    fetchNotes(c.id)
  }

  const openAdd = () => {
    setFName('')
    setFPhone('')
    setFEmail('')
    setFSource('walk-in')
    setFStatus('new')
    setPanelOpen(true)
  }

  const closeAdd = () => {
    setPanelOpen(false)
  }

  const handleCreateCustomer = async () => {
    if (!fName.trim() || !profile) return
    setSaving(true)

    const newCustomer = {
      tenant_id: profile.tenant_id,
      branch_id: profile.branch_id,
      name: fName.trim(),
      phone: fPhone.trim() || null,
      email: fEmail.trim() || null,
      source: fSource,
      lead_status: fStatus,
      assigned_to: profile.id, // Assign to self by default
    }

    const { data, error } = await supabase
      .from('customers')
      .insert(newCustomer)
      .select()

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Customer created successfully', 'success')
      
      // Auto create a lead entry too for monitoring
      if (data && data[0]) {
        await supabase.from('leads').insert({
          tenant_id: profile.tenant_id,
          branch_id: profile.branch_id,
          customer_id: data[0].id,
          assigned_to: profile.id,
          status: fStatus,
          source: fSource,
          notes: 'Customer created by Sales Executive'
        })
      }

      closeAdd()
      fetchCustomers()
    }
    setSaving(false)
  }

  const handleUpdateCustomer = async (c: Customer) => {
    if (!editName.trim() || !profile) return
    setSaving(true)

    // Employees can only edit if assigned to them (RLS restricts this, let's verify assigned)
    if (c.assigned_to !== profile.id) {
      // In a branch environment, can assign to self if unassigned
      const confirmAssign = window.confirm("You are not currently assigned to this customer. Would you like to assign this customer to yourself and edit details?")
      if (!confirmAssign) {
        setSaving(false)
        return
      }
    }

    const updates = {
      name: editName.trim(),
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
      source: editSource,
      lead_status: editStatus,
      assigned_to: profile.id, // Take ownership
    }

    const { error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', c.id)

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Customer updated and assigned to you', 'success')
      
      // Update lead board status too if it exists
      await supabase
        .from('leads')
        .update({ status: editStatus, assigned_to: profile.id })
        .eq('customer_id', c.id)

      fetchCustomers()
      setExpandedId(null)
    }
    setSaving(false)
  }

  const handleAddNote = async (customerId: string) => {
    if (!noteContent.trim() || !profile) return
    setNoteSaving(true)

    const newNote = {
      tenant_id: profile.tenant_id,
      customer_id: customerId,
      created_by: profile.id,
      content: noteContent.trim(),
      note_type: noteType,
    }

    const { error } = await supabase.from('customer_notes').insert(newNote)

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Interaction note saved', 'success')
      setNoteContent('')
      fetchNotes(customerId)
    }
    setNoteSaving(false)
  }

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer by name, phone or email..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <button
          onClick={panelOpen ? closeAdd : openAdd}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto shrink-0"
        >
          {panelOpen ? <X size={18} /> : <Plus size={18} />}
          {panelOpen ? 'Close panel' : 'Add customer'}
        </button>
      </div>

      {/* Add Customer Panel */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 space-y-6">
          <div>
            <h3 className="text-lg text-slate-900 pl-2">Create Customer Profile</h3>
            <p className="text-sm text-slate-500 pl-2 mt-1">Add a new customer to CRM directory. This automatically assigns them to you.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Full name</label>
              <div className="relative">
                <UserCircle size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fName}
                  onChange={e => setFName(e.target.value)}
                  placeholder="Customer full name"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Phone number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={fPhone}
                    onChange={e => setFPhone(e.target.value)}
                    placeholder="+91 99999 88888"
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Email address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={fEmail}
                    onChange={e => setFEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Lead Source</label>
                <select
                  value={fSource}
                  onChange={e => setFSource(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="walk-in">Walk-in Visit</option>
                  <option value="phone">Phone Call</option>
                  <option value="web">Website Inquiry</option>
                  <option value="referral">Referral</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Lead Status</label>
                <select
                  value={fStatus}
                  onChange={e => setFStatus(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="new">New Lead</option>
                  <option value="hot">Hot (High Intent)</option>
                  <option value="warm">Warm (Medium Intent)</option>
                  <option value="cold">Cold (Low Intent)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={closeAdd}
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCustomer}
              disabled={!fName.trim() || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Creating...' : 'Create customer'}
            </button>
          </div>
        </div>
      )}

      {/* Customer CRM Directory */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-24 rounded-[2.5rem]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-16 text-center">
          <p className="text-slate-500">No customer profiles found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(c => {
              const isExpanded = expandedId === c.id
              const isAssignedToMe = c.assigned_to === profile?.id

              return (
                <div key={c.id} className="transition-colors">
                  {/* Summary Bar */}
                  <div
                    onClick={() => handleToggleExpand(c)}
                    className={`p-6 md:p-8 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-all ${isExpanded ? 'bg-slate-50/70 border-b border-slate-100' : ''}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-medium">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-slate-900 font-medium text-lg truncate">{c.name}</p>
                          <span className={`text-[10px] uppercase tracking-wider font-bold rounded-full px-2.5 py-0.5 border ${statusColors[c.lead_status] || ''}`}>
                            {c.lead_status}
                          </span>
                          {isAssignedToMe && (
                            <span className="text-[10px] bg-slate-900 text-white font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5">
                              Assigned to you
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1 flex-wrap">
                          {c.phone && <span className="flex items-center gap-1"><Phone size={12} /> {c.phone}</span>}
                          {c.email && <span className="flex items-center gap-1"><Mail size={12} /> {c.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1.5 uppercase font-semibold">
                        Source: {c.source}
                      </span>
                      <span className="text-slate-400 group-hover:text-slate-600">
                        {isExpanded ? <X size={18} /> : <ArrowRight size={18} />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Content Panel */}
                  {isExpanded && (
                    <div className="p-6 md:p-12 px-6 md:px-12 bg-white border-b border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-10">
                      
                      {/* Left Column: Edit Details */}
                      <div className="space-y-6">
                        <h4 className="text-md font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <Clipboard size={18} className="text-slate-400" />
                          Update Customer Details
                        </h4>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs text-slate-600 pl-4">Full name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full rounded-full py-3.5 px-6 bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-slate-900 focus:bg-white transition-all outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs text-slate-600 pl-4">Phone number</label>
                              <input
                                type="tel"
                                value={editPhone}
                                onChange={e => setEditPhone(e.target.value)}
                                className="w-full rounded-full py-3.5 px-6 bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-slate-900 focus:bg-white transition-all outline-none"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs text-slate-600 pl-4">Email address</label>
                              <input
                                type="email"
                                value={editEmail}
                                onChange={e => setEditEmail(e.target.value)}
                                className="w-full rounded-full py-3.5 px-6 bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-slate-900 focus:bg-white transition-all outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs text-slate-600 pl-4">Source</label>
                              <select
                                value={editSource}
                                onChange={e => setEditSource(e.target.value)}
                                className="w-full rounded-full py-3.5 px-6 bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                              >
                                <option value="walk-in">Walk-in Visit</option>
                                <option value="phone">Phone Call</option>
                                <option value="web">Website Inquiry</option>
                                <option value="referral">Referral</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs text-slate-600 pl-4">Lead Status</label>
                              <select
                                value={editStatus}
                                onChange={e => setEditStatus(e.target.value)}
                                className="w-full rounded-full py-3.5 px-6 bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                              >
                                <option value="new">New Lead</option>
                                <option value="hot">Hot</option>
                                <option value="warm">Warm</option>
                                <option value="cold">Cold</option>
                                <option value="converted">Converted (Won)</option>
                                <option value="lost">Lost</option>
                              </select>
                            </div>
                          </div>

                          <button
                            onClick={() => handleUpdateCustomer(c)}
                            disabled={saving}
                            className="w-full bg-slate-900 text-white rounded-full py-3.5 flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm mt-4 font-medium"
                          >
                            <Check size={16} />
                            {saving ? 'Saving changes...' : isAssignedToMe ? 'Save changes' : 'Assign to Me & Save'}
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Interaction Notes */}
                      <div className="space-y-6 lg:border-l lg:border-slate-100 lg:pl-10">
                        <h4 className="text-md font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                          <MessageSquare size={18} className="text-slate-400" />
                          Interaction Log & Notes
                        </h4>

                        {/* Add Note Form */}
                        <div className="space-y-3 bg-slate-50 rounded-[1.5rem] p-5 border border-slate-200">
                          <textarea
                            value={noteContent}
                            onChange={e => setNoteContent(e.target.value)}
                            placeholder="Add brief details about the customer visit, phone call, or requirement details..."
                            rows={3}
                            className="w-full bg-white border border-slate-200 rounded-[1rem] p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none resize-none transition-all"
                          />
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Type:</span>
                              <select
                                value={noteType}
                                onChange={e => setNoteType(e.target.value)}
                                className="bg-white border border-slate-200 rounded-full py-1.5 px-4 text-xs text-slate-700 outline-none"
                              >
                                <option value="general">📝 General Note</option>
                                <option value="call">📞 Phone Call</option>
                                <option value="visit">🚗 Dealer Visit</option>
                                <option value="email">✉️ Email Update</option>
                              </select>
                            </div>
                            <button
                              onClick={() => handleAddNote(c.id)}
                              disabled={!noteContent.trim() || noteSaving}
                              className="bg-slate-900 text-white rounded-full px-5 py-2 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold"
                            >
                              {noteSaving ? 'Adding...' : 'Add Note'}
                            </button>
                          </div>
                        </div>

                        {/* Notes List */}
                        {notesLoading ? (
                          <div className="space-y-2">
                            <div className="skeleton h-14 rounded-xl" />
                            <div className="skeleton h-14 rounded-xl" />
                          </div>
                        ) : notes.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-6">No interactions logged yet for this customer.</p>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {notes.map(n => (
                              <div key={n.id} className="bg-slate-50 rounded-[1.25rem] p-4 border border-slate-100 flex gap-3">
                                <span className="text-lg shrink-0 mt-0.5" title={n.note_type}>
                                  {typeIcons[n.note_type] || '📝'}
                                </span>
                                <div className="space-y-1 min-w-0 flex-1">
                                  <p className="text-sm text-slate-800 break-words leading-relaxed whitespace-pre-wrap">{n.content}</p>
                                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                                    <span>By {n.profiles?.name || 'Staff'}</span>
                                    <span>{new Date(n.created_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

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
