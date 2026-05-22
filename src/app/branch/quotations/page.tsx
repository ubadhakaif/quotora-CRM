'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Search, FileText, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

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
      
      {loading?(
        <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-[2rem]"/>)}</div>
      ):filtered.length===0?<div className="text-center p-12 text-slate-500">No quotations found.</div>:(
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(q=>{
              const cust = q.customers&&typeof q.customers==='object'?q.customers.name:'—'
              const varName = q.variants&&typeof q.variants==='object'?q.variants.name:'—'
              const creator = q.profiles&&typeof q.profiles==='object'?q.profiles.name:'Unknown'
              const isPending = q.approval_status === 'pending'
              
              return (
                <div key={q.id} className="p-4 md:p-8 px-6 md:px-12 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50 transition-colors">
                  <Link href={`/branch/quotations/${q.id}`} className="flex items-center gap-4 flex-1 min-w-0 hover:opacity-85 transition-opacity">
                    <FileText size={18} className="text-slate-400 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-900 truncate font-medium">{cust}</p>
                        {q.approval_status && q.approval_status !== 'none' && (
                          <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${approvalColors[q.approval_status]}`}>
                            {q.approval_status === 'pending' ? 'Approval Pending' : `Discount ${q.approval_status}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate flex items-center gap-2">
                        {varName}
                        <span className="inline-flex items-center gap-1 text-slate-400">• By {creator}</span>
                      </p>
                    </div>
                  </Link>
                  
                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-sm text-slate-900">{formatINR(q.total_price)}</p>
                      {Number(q.discount_amount) > 0 && (
                        <p className="text-xs text-emerald-600">- {formatINR(q.discount_amount)} discount</p>
                      )}
                    </div>
                    <span className={`text-xs rounded-full px-3 py-1 shrink-0 ${statusColors[q.status]||''}`}>{q.status}</span>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <button onClick={() => handleApproval(q.id, 'approved')} className="p-2 text-emerald-600 bg-emerald-50 rounded-full hover:bg-emerald-100 transition-colors" title="Approve Discount"><CheckCircle size={16} /></button>
                          <button onClick={() => handleApproval(q.id, 'rejected')} className="p-2 text-rose-600 bg-rose-50 rounded-full hover:bg-rose-100 transition-colors" title="Reject Discount"><XCircle size={16} /></button>
                        </>
                      )}
                      {(q.status === 'rejected' || q.status === 'approved') && (
                        <button onClick={() => handleReopen(q.id)} className="p-2 text-slate-600 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors" title="Reopen Draft"><RefreshCw size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
