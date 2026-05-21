'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Search, ShieldAlert, ArrowRight, UserCircle, Phone, Mail, Building2, User, FileText, Bookmark } from 'lucide-react'

interface Branch { id: string; name: string }
interface Profile { id: string; name: string; branch_id: string | null }
interface Customer { id: string; name: string; phone: string | null; email: string | null }
interface Quotation {
  id: string
  customer_id: string | null
  total_price: number
  discount_amount: number
  status: string
  variants?: {
    name: string
    price: number
    models?: { name: string } | null
  } | null
}
interface Lead {
  id: string
  status: string
  source: string
  priority: number
  escalated: boolean
  notes: string | null
  created_at: string
  customer_id: string
  branch_id: string | null
  assigned_to: string | null
  customers?: Customer | null
  profiles?: Profile | null
  branches?: Branch | null
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  hot: 'bg-rose-50 text-rose-700 border-rose-200',
  warm: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-slate-100 text-slate-700 border-slate-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-150 text-slate-500 border-slate-250',
}

const sourceLabels: Record<string, string> = {
  'walk-in': '🚶 Walk-In',
  'phone': '📞 Phone',
  'web': '🌐 Web',
  'referral': '🤝 Referral',
}

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [empFilter, setEmpFilter] = useState('all')
  
  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    const [lRes, bRes, eRes, qRes] = await Promise.all([
      supabase
        .from('leads')
        .select('*, customers(id, name, phone, email), profiles(id, name, branch_id), branches(id, name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('profiles')
        .select('id, name, branch_id')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('quotations')
        .select('*, variants(name, price, models(name))')
        .eq('is_active', true)
    ])

    if (lRes.data) setLeads(lRes.data as any[])
    if (bRes.data) setBranches(bRes.data)
    if (eRes.data) setEmployees(eRes.data as any[])
    if (qRes.data) setQuotations(qRes.data as any[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id)
    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Lead status updated successfully', 'success')
      fetchData()
    }
  }

  const handleAssignExecutive = async (id: string, empId: string) => {
    const val = empId === 'unassigned' ? null : empId
    const emp = employees.find(e => e.id === empId)
    const branchVal = emp ? emp.branch_id : null

    const updatePayload: Record<string, any> = { assigned_to: val }
    if (branchVal) {
      updatePayload.branch_id = branchVal
    }

    const { error } = await supabase.from('leads').update(updatePayload).eq('id', id)
    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Lead executive assignment updated', 'success')
      fetchData()
    }
  }

  const handleAssignBranch = async (id: string, branchId: string) => {
    const val = branchId === 'nobranch' ? null : branchId
    const { error } = await supabase.from('leads').update({ branch_id: val, assigned_to: null }).eq('id', id)
    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Lead branch reassigned successfully', 'success')
      fetchData()
    }
  }

  const handleToggleEscalation = async (id: string, current: boolean) => {
    const { error } = await supabase.from('leads').update({ escalated: !current }).eq('id', id)
    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast(`Lead ${!current ? 'escalated to high priority' : 'escalation removed'}`, 'success')
      fetchData()
    }
  }

  const getLeadQuotations = (customerId: string) => {
    return quotations.filter(q => q.customer_id === customerId)
  }

  const filtered = leads.filter(l => {
    const custName = l.customers?.name || ''
    const custPhone = l.customers?.phone || ''
    const custEmail = l.customers?.email || ''
    const matchSearch =
      custName.toLowerCase().includes(search.toLowerCase()) ||
      custPhone.includes(search) ||
      custEmail.toLowerCase().includes(search.toLowerCase())

    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchBranch = branchFilter === 'all' || l.branch_id === branchFilter
    const matchEmp = empFilter === 'all' || (empFilter === 'unassigned' ? !l.assigned_to : l.assigned_to === empFilter)

    return matchSearch && matchStatus && matchBranch && matchEmp
  })

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col xl:flex-row items-stretch gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads by customer name, phone, or email..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none font-medium"
          >
            <option value="all">All Lead Statuses</option>
            <option value="new">New</option>
            <option value="hot">Hot 🔥</option>
            <option value="warm">Warm ☀️</option>
            <option value="cold">Cold ❄️</option>
            <option value="converted">Converted 🎉</option>
            <option value="lost">Lost ❌</option>
          </select>

          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none font-medium"
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={empFilter}
            onChange={e => setEmpFilter(e.target.value)}
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none font-medium"
          >
            <option value="all">All Executives</option>
            <option value="unassigned">Unassigned Leads</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 rounded-[2rem]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No leads matching your active filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(lead => {
            const leadQuotes = getLeadQuotations(lead.customer_id)
            return (
              <div
                key={lead.id}
                className={`bg-white border transition-all rounded-[2rem] p-6 md:p-8 space-y-6 hover:shadow-sm ${
                  lead.escalated ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'
                }`}
              >
                {/* Header Block */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-slate-950 font-bold text-lg">{lead.customers?.name}</h3>
                      <span className={`text-[10px] uppercase tracking-wider font-extrabold rounded-full px-3 py-1 border ${statusColors[lead.status]}`}>
                        {lead.status}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                        {sourceLabels[lead.source] || lead.source}
                      </span>
                      {lead.escalated && (
                        <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1">
                          <ShieldAlert size={12} /> Escalated
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-xs mt-1">
                      {lead.customers?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {lead.customers.phone}
                        </span>
                      )}
                      {lead.customers?.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} /> {lead.customers.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions / Admin Controllers */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase block pl-2">Lead Status</label>
                      <select
                        value={lead.status}
                        onChange={e => handleStatusChange(lead.id, e.target.value)}
                        className="rounded-full py-2 px-4 bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold outline-none hover:bg-slate-100"
                      >
                        <option value="new">New</option>
                        <option value="hot">Hot 🔥</option>
                        <option value="warm">Warm ☀️</option>
                        <option value="cold">Cold ❄️</option>
                        <option value="converted">Converted 🎉</option>
                        <option value="lost">Lost ❌</option>
                      </select>
                    </div>

                    {/* Branch Assignment */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase block pl-2">Dealership Branch</label>
                      <select
                        value={lead.branch_id || 'nobranch'}
                        onChange={e => handleAssignBranch(lead.id, e.target.value)}
                        className="rounded-full py-2 px-4 bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold outline-none hover:bg-slate-100"
                      >
                        <option value="nobranch">No Branch Assigned</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sales Executive Assignment */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-semibold uppercase block pl-2">Sales Executive</label>
                      <div className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200">
                        <ArrowRight size={12} className="text-slate-400" />
                        <select
                          value={lead.assigned_to || 'unassigned'}
                          onChange={e => handleAssignExecutive(lead.id, e.target.value)}
                          className="bg-transparent text-xs py-0.5 pr-2 outline-none font-semibold text-slate-700"
                        >
                          <option value="unassigned">Unassigned</option>
                          {employees
                            .filter(emp => !lead.branch_id || emp.branch_id === lead.branch_id)
                            .map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* Escalation Toggle */}
                    <button
                      onClick={() => handleToggleEscalation(lead.id, lead.escalated)}
                      className={`p-2.5 rounded-full border transition-all ${
                        lead.escalated
                          ? 'bg-rose-100 border-rose-200 text-rose-600 hover:bg-rose-200'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                      title={lead.escalated ? 'Remove escalation' : 'Escalate lead priority'}
                    >
                      <ShieldAlert size={16} />
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Notes / Comments */}
                  <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-2">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Bookmark size={14} className="text-slate-400" /> Executive Notes
                    </p>
                    <p className="text-xs text-slate-600 italic leading-relaxed">
                      {lead.notes || 'No active details or follow-up notes reported.'}
                    </p>
                    <div className="flex gap-4 pt-2 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} /> Branch: {lead.branches?.name || 'Unassigned'}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} /> Executive: {lead.profiles?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {/* Associated Quotation details */}
                  <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-3">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-slate-400" /> Active Quotations & Projections
                    </p>
                    {leadQuotes.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No quotation draft configured yet for this customer.</p>
                    ) : (
                      <div className="space-y-3">
                        {leadQuotes.map(quote => (
                          <div key={quote.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center gap-4 text-xs">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">
                                {quote.variants?.models?.name} {quote.variants?.name}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Ex-Showroom: {formatINR(quote.variants?.price || 0)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-slate-900">{formatINR(quote.total_price)}</p>
                              {quote.discount_amount > 0 && (
                                <p className="text-[9px] text-emerald-600 font-semibold">
                                  Discount: -{formatINR(quote.discount_amount)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
