'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Search, FileText, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'

interface Variant { id: string; name: string; price: number; models?: {name:string} | {name:string}[] | null }
interface Customer { id: string; name: string }
interface Profile { id: string; name: string }
interface Quotation {
  id: string; status: string; approval_status: string; total_price: number; discount_amount: number; created_at: string
  customer_id: string|null; variant_id: string|null; branch_id: string|null; created_by: string|null
  customers?: {name:string}|null; variants?: {name:string; models?: {name:string}|null}|null
  profiles?: {name:string}|null;
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)
const statusColors: Record<string,string> = { draft:'bg-slate-100 text-slate-600', sent:'bg-blue-50 text-blue-700', approved:'bg-emerald-50 text-emerald-700', rejected:'bg-rose-50 text-rose-700' }
const approvalColors: Record<string,string> = { none: '', pending: 'bg-amber-50 text-amber-700 border border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200', rejected: 'bg-rose-50 text-rose-700 border border-rose-200' }

export default function BranchQuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page to 1 on search change
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    if (!profile?.branch_id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('quotations')
      .select('*, customers(name), variants(name, models(name)), profiles!quotations_created_by_fkey(name)')
      .eq('is_active', true)
      .eq('branch_id', profile.branch_id)
      .order('created_at', { ascending: false })

    if (error) {
      addToast(error.message, 'error')
    } else if (data) {
      setQuotes(data as any)
    }
    setLoading(false)
  }
  
  useEffect(() => { fetchAll() }, [profile]) // eslint-disable-line

  const handleApproval = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('quotations').update({
      approval_status: newStatus,
      approved_by: profile?.id
    }).eq('id', id)
    if (error) addToast(error.message, 'error')
    else {
      addToast(`Quotation ${newStatus}`, 'success')
      fetchAll()
    }
  }

  const handleReopen = async (id: string) => {
    const { error } = await supabase.from('quotations').update({
      status: 'draft',
      approval_status: 'none'
    }).eq('id', id)
    if (error) addToast(error.message, 'error')
    else {
      addToast('Quotation reopened', 'success')
      fetchAll()
    }
  }

  const filtered = quotes.filter(q => {
    const custName = q.customers&&typeof q.customers==='object'?q.customers.name:''
    const matchSearch = custName.toLowerCase().includes(search.toLowerCase())||q.status.includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input 
            type="text" 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Search branch quotations..." 
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[2rem]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No quotations found.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Customer</th>
                  <th className="py-5 px-6">Vehicle Specification</th>
                  <th className="py-5 px-6">Total Price</th>
                  <th className="py-5 px-6">Status</th>
                  <th className="py-5 px-6">Created On</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(q => {
                  const cust = q.customers && typeof q.customers === 'object' ? q.customers.name : '—'
                  const varName = q.variants && typeof q.variants === 'object' ? q.variants.name : '—'
                  const modelName = q.variants && typeof q.variants === 'object' && q.variants.models && typeof q.variants.models === 'object' && 'name' in q.variants.models ? (q.variants.models as { name: string }).name : ''
                  const creator = q.profiles && typeof q.profiles === 'object' ? q.profiles.name : 'Unknown'
                  const isPending = q.approval_status === 'pending'

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Customer Info */}
                      <td className="py-5 px-6 md:px-8 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                            {cust.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{cust}</p>
                            <p className="text-[11px] text-slate-500 font-medium">By {creator}</p>
                          </div>
                        </div>
                      </td>

                      {/* Vehicle Specification */}
                      <td className="py-5 px-6 min-w-[160px]">
                        <p className="font-semibold text-slate-800">{varName}</p>
                        {modelName && (
                          <span className="text-[11px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 mt-0.5 inline-block font-semibold">
                            {modelName}
                          </span>
                        )}
                      </td>

                      {/* Total Price & Discount */}
                      <td className="py-5 px-6 min-w-[150px]">
                        <p className="font-semibold text-slate-955">{formatINR(q.total_price)}</p>
                        {Number(q.discount_amount) > 0 && (
                          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                            -{formatINR(q.discount_amount)} discount
                          </p>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="py-5 px-6 min-w-[200px]">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${statusColors[q.status] || ''}`}>
                            {q.status}
                          </span>
                          {q.approval_status && q.approval_status !== 'none' && (
                            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${approvalColors[q.approval_status]}`}>
                              Approval: {q.approval_status}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created On */}
                      <td className="py-5 px-6 min-w-[140px] text-slate-600 font-medium">
                        {new Date(q.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-5 px-6 md:pr-8 text-right min-w-[150px]">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <button 
                                onClick={() => handleApproval(q.id, 'approved')} 
                                className="p-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer" 
                                title="Approve Discount"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button 
                                onClick={() => handleApproval(q.id, 'rejected')} 
                                className="p-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors cursor-pointer" 
                                title="Reject Discount"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          {(q.status === 'rejected' || q.status === 'approved') && (
                            <button 
                              onClick={() => handleReopen(q.id)} 
                              className="p-2 text-slate-600 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 transition-colors cursor-pointer" 
                              title="Reopen Draft"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                          <Link
                            href={`/branch/quotations/${q.id}`}
                            className="inline-flex items-center gap-1 bg-slate-900 text-white rounded-full px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye size={12} /> View
                          </Link>
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
