'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Search, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'

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

export function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [empFilter, setEmpFilter] = useState('all')
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page to 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, branchFilter, empFilter])

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
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-950 focus:border-slate-900 transition-all outline-none appearance-none font-medium cursor-pointer"
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
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-950 focus:border-slate-900 transition-all outline-none appearance-none font-medium cursor-pointer"
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
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-950 focus:border-slate-900 transition-all outline-none appearance-none font-medium cursor-pointer"
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

      {/* Leads Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-20 rounded-[2rem]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No leads matching your active filters.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Customer</th>
                  <th className="py-5 px-6">Status</th>
                  <th className="py-5 px-6">Dealership Branch</th>
                  <th className="py-5 px-6">Sales Executive</th>
                  <th className="py-5 px-6">Executive Notes</th>
                  <th className="py-5 px-6">Active Projections</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(lead => {
                  const leadQuotes = getLeadQuotations(lead.customer_id)
                  return (
                    <tr 
                      key={lead.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        lead.escalated ? 'bg-rose-50/10' : ''
                      }`}
                    >
                      {/* Customer info */}
                      <td className="py-5 px-6 md:px-8 min-w-[220px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{lead.customers?.name || '—'}</span>
                            {lead.escalated && (
                              <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <ShieldAlert size={10} /> Escalated
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 space-y-0.5">
                            {lead.customers?.phone && <p>{lead.customers.phone}</p>}
                            {lead.customers?.email && <p className="truncate max-w-[200px]">{lead.customers.email}</p>}
                            <p className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full inline-block mt-1">
                              {sourceLabels[lead.source] || lead.source}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status select dropdown */}
                      <td className="py-5 px-6 min-w-[145px]">
                        <select
                          value={lead.status}
                          onChange={e => handleStatusChange(lead.id, e.target.value)}
                          className={`rounded-full py-1.5 px-3 text-xs font-semibold border outline-none cursor-pointer hover:bg-slate-50 ${statusColors[lead.status] || ''}`}
                        >
                          <option value="new">New</option>
                          <option value="hot">Hot 🔥</option>
                          <option value="warm">Warm ☀️</option>
                          <option value="cold">Cold ❄️</option>
                          <option value="converted">Converted 🎉</option>
                          <option value="lost">Lost ❌</option>
                        </select>
                      </td>

                      {/* Branch select dropdown */}
                      <td className="py-5 px-6 min-w-[180px]">
                        <select
                          value={lead.branch_id || 'nobranch'}
                          onChange={e => handleAssignBranch(lead.id, e.target.value)}
                          className="rounded-full py-1.5 px-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
                        >
                          <option value="nobranch">No Branch Assigned</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Sales Executive select dropdown */}
                      <td className="py-5 px-6 min-w-[180px]">
                        <select
                          value={lead.assigned_to || 'unassigned'}
                          onChange={e => handleAssignExecutive(lead.id, e.target.value)}
                          className="rounded-full py-1.5 px-3 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
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
                      </td>

                      {/* Notes Column */}
                      <td className="py-5 px-6 min-w-[180px]">
                        <div className="max-w-[200px] text-xs text-slate-600 italic truncate" title={lead.notes || ''}>
                          {lead.notes || 'No active details or follow-up notes reported.'}
                        </div>
                      </td>

                      {/* Associated Quotations list */}
                      <td className="py-5 px-6 min-w-[240px]">
                        {leadQuotes.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">No quotes draft configured yet</span>
                        ) : (
                          <div className="space-y-1.5">
                            {leadQuotes.map(quote => (
                              <Link 
                                href={`/dashboard/quotations/${quote.id}`} 
                                key={quote.id} 
                                className="flex justify-between items-center gap-2 p-2 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all text-xs"
                              >
                                <span className="font-medium text-slate-700 truncate max-w-[120px]">
                                  {quote.variants?.models?.name} {quote.variants?.name}
                                </span>
                                <span className="font-bold text-slate-900 shrink-0">
                                  {formatINR(quote.total_price)}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Escalation Actions */}
                      <td className="py-5 px-6 md:pr-8 text-right min-w-[100px]">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleEscalation(lead.id, lead.escalated)}
                            className={`p-2 rounded-full border transition-all cursor-pointer ${
                              lead.escalated
                                ? 'bg-rose-100 border-rose-200 text-rose-600 hover:bg-rose-200'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                            title={lead.escalated ? 'Remove escalation' : 'Escalate lead priority'}
                          >
                            <ShieldAlert size={14} className="shrink-0" />
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
