'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, FileText, Search } from 'lucide-react'

interface Variant { id: string; name: string; price: number; models?: {name:string} | {name:string}[] | null }
interface Customer { id: string; name: string }
interface Quotation {
  id: string; status: string; total_price: number; created_at: string
  customer_id: string|null; variant_id: string|null
  customers?: {name:string}|null; variants?: {name:string; models?: {name:string}|null}|null
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)
const statusColors: Record<string,string> = { draft:'bg-slate-100 text-slate-600', sent:'bg-blue-50 text-blue-700', approved:'bg-emerald-50 text-emerald-700', rejected:'bg-rose-50 text-rose-700' }

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [fCustId, setFCustId] = useState(''); const [fVarId, setFVarId] = useState('')
  const [fStatus, setFStatus] = useState('draft'); const [saving, setSaving] = useState(false)
  const { profile } = useAuth(); const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [q, v, c] = await Promise.all([
      supabase.from('quotations').select('*, customers(name), variants(name, models(name))').eq('is_active',true).order('created_at',{ascending:false}),
      supabase.from('variants').select('id,name,price,models(name)').eq('is_active',true).order('name'),
      supabase.from('customers').select('id,name').eq('is_active',true).order('name'),
    ])
    if(q.data) setQuotes(q.data); if(v.data) setVariants(v.data); if(c.data) setCustomers(c.data)
    setLoading(false)
  }
  useEffect(()=>{fetchAll()}, []) // eslint-disable-line

  const close = () => { setPanelOpen(false);setFCustId('');setFVarId('');setFStatus('draft') }

  const save = async () => {
    if(!fVarId||!fCustId) return; setSaving(true)
    const selectedVariant = variants.find(v=>v.id===fVarId)
    const {error} = await supabase.from('quotations').insert({
      tenant_id:profile?.tenant_id, branch_id: null,
      customer_id:fCustId, variant_id:fVarId,
      total_price: selectedVariant?.price||0,
      status:fStatus, created_by:profile?.id,
    })
    if(error) addToast(error.message,'error')
    else { addToast('Quotation created','success');close();fetchAll() }
    setSaving(false)
  }

  const filtered = quotes.filter(q => {
    const custName = q.customers&&typeof q.customers==='object'?q.customers.name:''
    return custName.toLowerCase().includes(search.toLowerCase())||q.status.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1"><Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quotations..." className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"/></div>
        <button onClick={panelOpen?close:()=>setPanelOpen(true)} className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto">{panelOpen?<X size={18}/>:<Plus size={18}/>} {panelOpen?'Close panel':'New quotation'}</button>
      </div>
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">New quotation</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Customer</label><select value={fCustId} onChange={e=>setFCustId(e.target.value)} className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Variant</label><select value={fVarId} onChange={e=>setFVarId(e.target.value)} className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"><option value="">Select variant</option>{variants.map(v=><option key={v.id} value={v.id}>{v.models&&typeof v.models==='object'?(v.models as {name:string}).name+' — ':''}{v.name} ({formatINR(v.price)})</option>)}</select></div>
            </div>
            <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Status</label><select value={fStatus} onChange={e=>setFStatus(e.target.value)} className="w-full sm:w-auto rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"><option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={close} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial">Cancel</button>
            <button onClick={save} disabled={!fCustId||!fVarId||saving} className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto">{saving?'Creating...':'Create quotation'}</button>
          </div>
        </div>
      )}
      {loading?(
        <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-[2rem]"/>)}</div>
      ):filtered.length===0?<div/>:(
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(q=>{
              const cust = q.customers&&typeof q.customers==='object'?q.customers.name:'—'
              const varName = q.variants&&typeof q.variants==='object'?q.variants.name:'—'
              return (
                <div key={q.id} className="p-4 md:p-8 px-6 md:px-12 flex items-center gap-4">
                  <FileText size={18} className="text-slate-400 shrink-0"/>
                  <div className="flex-1 min-w-0"><p className="text-slate-900 truncate">{cust}</p><p className="text-sm text-slate-500 truncate">{varName}</p></div>
                  <span className={`text-xs rounded-full px-3 py-1 shrink-0 ${statusColors[q.status]||''}`}>{q.status}</span>
                  <span className="text-sm text-slate-700 shrink-0">{formatINR(q.total_price)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
