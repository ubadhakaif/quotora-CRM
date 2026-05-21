'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, FileText, Search, CheckCircle, XCircle, Building2, RefreshCw } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'

interface Variant { id: string; name: string; price: number; models?: {name:string} | {name:string}[] | null }
interface Customer { id: string; name: string }
interface Branch { id: string; name: string }
interface Quotation {
  id: string; status: string; approval_status: string; total_price: number; discount_amount: number; created_at: string
  customer_id: string|null; variant_id: string|null; branch_id: string|null;
  customers?: {name:string}|null; variants?: {name:string; models?: {name:string}|null}|null
  branches?: {name:string}|null;
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)
const statusColors: Record<string,string> = { draft:'bg-slate-100 text-slate-600', sent:'bg-blue-50 text-blue-700', approved:'bg-emerald-50 text-emerald-700', rejected:'bg-rose-50 text-rose-700' }
const approvalColors: Record<string,string> = { none: '', pending: 'bg-amber-50 text-amber-700 border border-amber-200', approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200', rejected: 'bg-rose-50 text-rose-700 border border-rose-200' }

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all')
  const [fCustId, setFCustId] = useState('')
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select')
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustEmail, setNewCustEmail] = useState('')
  const [newCustSource, setNewCustSource] = useState('walk-in')
  const [newCustStatus, setNewCustStatus] = useState('new')
  const [fVarId, setFVarId] = useState('')
  const [fStatus, setFStatus] = useState('draft'); const [saving, setSaving] = useState(false)
  const { profile } = useAuth(); const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [q, v, c, b] = await Promise.all([
      supabase.from('quotations').select('*, customers(name), variants(name, models(name)), branches(name)').eq('is_active',true).order('created_at',{ascending:false}),
      supabase.from('variants').select('id,name,price,models(name)').eq('is_active',true).order('name'),
      supabase.from('customers').select('id,name').eq('is_active',true).order('name'),
      supabase.from('branches').select('id,name').eq('is_active',true).order('name')
    ])
    if(q.data) setQuotes(q.data); if(v.data) setVariants(v.data); if(c.data) setCustomers(c.data); if(b.data) setBranches(b.data)
    setLoading(false)
  }
  useEffect(()=>{fetchAll()}, []) // eslint-disable-line

  const close = () => {
    setPanelOpen(false)
    setFCustId('')
    setCustomerMode('select')
    setNewCustName('')
    setNewCustPhone('')
    setNewCustEmail('')
    setNewCustSource('walk-in')
    setNewCustStatus('new')
    setFVarId('')
    setFStatus('draft')
  }

  const save = async () => {
    if (customerMode === 'select' && !fCustId) return
    if (customerMode === 'new' && !newCustName.trim()) return
    if (!fVarId || !profile) return
    setSaving(true)

    let finalCustomerId = fCustId

    if (customerMode === 'new') {
      const newCustomer = {
        tenant_id: profile.tenant_id,
        branch_id: profile.branch_id,
        name: newCustName.trim(),
        phone: newCustPhone.trim() || null,
        email: newCustEmail.trim() || null,
        source: newCustSource,
        lead_status: newCustStatus,
        assigned_to: profile.id,
      }

      const { data: custData, error: custError } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single()

      if (custError) {
        addToast(`Failed to create customer: ${custError.message}`, 'error')
        setSaving(false)
        return
      }

      if (custData) {
        finalCustomerId = custData.id
        
        // Auto create a lead entry too for monitoring
        await supabase.from('leads').insert({
          tenant_id: profile.tenant_id,
          branch_id: profile.branch_id,
          customer_id: custData.id,
          assigned_to: profile.id,
          status: newCustStatus,
          source: newCustSource,
          notes: 'Customer created inline during Quotation Building'
        })
      }
    }

    const selectedVariant = variants.find(v=>v.id===fVarId)
    const {error} = await supabase.from('quotations').insert({
      tenant_id:profile?.tenant_id, branch_id: null,
      customer_id:finalCustomerId, variant_id:fVarId,
      total_price: selectedVariant?.price||0,
      status:fStatus, created_by:profile?.id,
    })
    if(error) addToast(error.message,'error')
    else { addToast('Quotation created','success');close();fetchAll() }
    setSaving(false)
  }

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
    const matchBranch = selectedBranchFilter === 'all' || q.branch_id === selectedBranchFilter
    return matchSearch && matchBranch
  })

  const totalQuotes = quotes.length
  const pendingApprovals = quotes.filter(q => q.approval_status === 'pending').length
  const totalValue = quotes.reduce((acc, q) => acc + Number(q.total_price || 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Quotations" value={totalQuotes} icon={FileText} />
          <StatCard label="Pending Approvals" value={pendingApprovals} icon={CheckCircle} />
          <StatCard label="Total Pipeline Value" value={formatINR(totalValue)} icon={FileText} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quotations..." className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"/>
        </div>
        <select
          value={selectedBranchFilter}
          onChange={e => setSelectedBranchFilter(e.target.value)}
          className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none"
        >
          <option value="all">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button onClick={panelOpen?close:()=>setPanelOpen(true)} className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto">{panelOpen?<X size={18}/>:<Plus size={18}/>} {panelOpen?'Close panel':'New quotation'}</button>
      </div>
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-6">
          <h3 className="text-lg text-slate-900 pl-2">New quotation</h3>
          
          <div className="space-y-4">
            {/* Step 1: Customer Profile Toggler */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <label className="text-sm font-semibold text-slate-600 pl-2">Customer Profile</label>
                <div className="flex bg-slate-100 p-1 rounded-full text-xs">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('select')}
                    className={`rounded-full px-4 py-1.5 transition-all ${customerMode === 'select' ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new')}
                    className={`rounded-full px-4 py-1.5 transition-all ${customerMode === 'new' ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Create New
                  </button>
                </div>
              </div>

              {customerMode === 'select' ? (
                <div className="space-y-2">
                  <select
                    value={fCustId}
                    onChange={e => setFCustId(e.target.value)}
                    className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none text-sm"
                  >
                    <option value="">Select customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-200/60">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 pl-4 font-medium">Customer Name *</label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={e => setNewCustName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Phone Number</label>
                      <input
                        type="tel"
                        value={newCustPhone}
                        onChange={e => setNewCustPhone(e.target.value)}
                        placeholder="e.g. +91 99999 88888"
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Email Address</label>
                      <input
                        type="email"
                        value={newCustEmail}
                        onChange={e => setNewCustEmail(e.target.value)}
                        placeholder="e.g. john@example.com"
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Lead Source</label>
                      <select
                        value={newCustSource}
                        onChange={e => setNewCustSource(e.target.value)}
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 outline-none text-sm"
                      >
                        <option value="walk-in">Walk-in Visit</option>
                        <option value="phone">Phone Call</option>
                        <option value="web">Website Inquiry</option>
                        <option value="referral">Referral</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Lead Status</label>
                      <select
                        value={newCustStatus}
                        onChange={e => setNewCustStatus(e.target.value)}
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 outline-none text-sm"
                      >
                        <option value="new">New Lead</option>
                        <option value="hot">Hot (High Intent)</option>
                        <option value="warm">Warm (Medium Intent)</option>
                        <option value="cold">Cold (Low Intent)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Variant & Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Variant</label>
                <select
                  value={fVarId}
                  onChange={e => setFVarId(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none text-sm"
                >
                  <option value="">Select variant</option>
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.models && typeof v.models === 'object' ? (v.models as { name: string }).name + ' — ' : ''}
                      {v.name} ({formatINR(v.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Status</label>
                <select
                  value={fStatus}
                  onChange={e => setFStatus(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={close}
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={(customerMode === 'select' && !fCustId) || (customerMode === 'new' && !newCustName.trim()) || !fVarId || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Creating...' : 'Create quotation'}
            </button>
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
              const branchName = q.branches&&typeof q.branches==='object'?q.branches.name:'No Branch'
              const isPending = q.approval_status === 'pending'
              
              return (
                <div key={q.id} className="p-4 md:p-8 px-6 md:px-12 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <FileText size={18} className="text-slate-400 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-900 truncate">{cust}</p>
                        {q.approval_status && q.approval_status !== 'none' && (
                          <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${approvalColors[q.approval_status]}`}>
                            {q.approval_status === 'pending' ? 'Approval Pending' : `Discount ${q.approval_status}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate flex items-center gap-2">
                        {varName}
                        <span className="inline-flex items-center gap-1 text-slate-400"><Building2 size={12}/>{branchName}</span>
                      </p>
                    </div>
                  </div>
                  
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
