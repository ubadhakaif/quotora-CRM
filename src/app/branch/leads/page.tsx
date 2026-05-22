'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Search, Filter, AlertCircle, ArrowRight } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'

interface Profile {
  id: string
  name: string
}

interface Customer {
  id: string
  name: string
  phone: string
}

interface Lead {
  id: string
  status: string
  created_at: string
  customer_id: string
  assigned_to: string | null
  customers?: Customer | null
  profiles?: Profile | null
  is_escalated?: boolean
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  hot: 'bg-rose-50 text-rose-700 border-rose-200',
  warm: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-slate-100 text-slate-700 border-slate-200',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-500 border-slate-200'
}

export default function BranchLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [empFilter, setEmpFilter] = useState('all')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page to 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, empFilter])
  
  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchData = async () => {
    if (!profile?.branch_id) return
    setLoading(true)
    const [lRes, eRes] = await Promise.all([
      supabase
        .from('leads')
        .select('*, customers(id, name, phone), profiles(id, name)')
        .eq('branch_id', profile.branch_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, name')
        .eq('branch_id', profile.branch_id)
        .eq('is_active', true)
        .order('name')
    ])
    
    if (lRes.data) setLeads(lRes.data as any)
    if (eRes.data) setEmployees(eRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id)
    if (error) addToast(error.message, 'error')
    else { addToast('Status updated', 'success'); fetchData() }
  }

  const handleAssign = async (id: string, empId: string) => {
    const val = empId === 'unassigned' ? null : empId
    const { error } = await supabase.from('leads').update({ assigned_to: val }).eq('id', id)
    if (error) addToast(error.message, 'error')
    else { addToast('Lead reassigned', 'success'); fetchData() }
  }

  const handleEscalate = async (id: string) => {
    // In a real app, you might have an is_escalated column on leads or customers
    addToast('Lead escalated to Admin (Simulation)', 'success')
  }

  const filtered = leads.filter(l => {
    const cName = l.customers?.name || ''
    const matchSearch = cName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchEmp = empFilter === 'all' || (empFilter === 'unassigned' ? !l.assigned_to : l.assigned_to === empFilter)
    return matchSearch && matchStatus && matchEmp
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads by customer name..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        
        <div className="flex gap-2 shrink-0">
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          
          <select 
            value={empFilter} 
            onChange={e => setEmpFilter(e.target.value)}
            className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none"
          >
            <option value="all">All Employees</option>
            <option value="unassigned">Unassigned</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[2rem]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No leads found matching criteria.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Customer</th>
                  <th className="py-5 px-6">Current Status</th>
                  <th className="py-5 px-6">Change Status</th>
                  <th className="py-5 px-6">Reassign Executive</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(lead => {
                  const customerName = lead.customers?.name || '—'
                  const customerPhone = lead.customers?.phone
                  
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Customer Info */}
                      <td className="py-5 px-6 md:px-8 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{customerName}</p>
                            {customerPhone && <p className="text-[11px] text-slate-400">{customerPhone}</p>}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Created: {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="py-5 px-6 min-w-[120px]">
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${statusColors[lead.status] || ''}`}>
                          {lead.status}
                        </span>
                      </td>

                      {/* Change Status Dropdown */}
                      <td className="py-5 px-6 min-w-[165px]">
                        <select 
                          value={lead.status}
                          onChange={e => handleStatusChange(lead.id, e.target.value)}
                          className="rounded-full py-1.5 px-3 bg-white border border-slate-200 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50 cursor-pointer"
                        >
                          <option value="new">Set: New</option>
                          <option value="hot">Set: Hot</option>
                          <option value="warm">Set: Warm</option>
                          <option value="cold">Set: Cold</option>
                          <option value="won">Set: Won</option>
                          <option value="lost">Set: Lost</option>
                        </select>
                      </td>

                      {/* Reassign Executive Dropdown */}
                      <td className="py-5 px-6 min-w-[180px]">
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                          <ArrowRight size={12} className="text-slate-400" />
                          <select
                            value={lead.assigned_to || 'unassigned'}
                            onChange={e => handleAssign(lead.id, e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-2"
                          >
                            <option value="unassigned">Unassigned</option>
                            {employees.map(e => (
                              <option key={e.id} value={e.id}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-5 px-6 md:pr-8 text-right min-w-[100px]">
                        <button 
                          onClick={() => handleEscalate(lead.id)}
                          className="inline-flex items-center justify-center p-2 text-rose-500 bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Escalate to Admin"
                        >
                          <AlertCircle size={14} />
                        </button>
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
