'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, UserCircle, Search, Phone, Mail } from 'lucide-react'

interface Customer { id: string; name: string; phone: string|null; email: string|null; branch_id: string|null }
interface Branch { id: string; name: string }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Customer|null>(null)
  const [search, setSearch] = useState('')
  const [fName, setFName] = useState(''); const [fPhone, setFPhone] = useState('')
  const [fEmail, setFEmail] = useState(''); const [fBranch, setFBranch] = useState('')
  const [saving, setSaving] = useState(false)
  const { profile } = useAuth(); const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [c, b] = await Promise.all([
      supabase.from('customers').select('*').eq('is_active',true).order('created_at',{ascending:false}),
      supabase.from('branches').select('id,name').eq('is_active',true),
    ])
    if(c.data) setCustomers(c.data); if(b.data) setBranches(b.data)
    setLoading(false)
  }
  useEffect(()=>{fetchAll()}, []) // eslint-disable-line

  const openAdd = () => { setEditing(null);setFName('');setFPhone('');setFEmail('');setFBranch('');setPanelOpen(true) }
  const openEdit = (c: Customer) => { setEditing(c);setFName(c.name);setFPhone(c.phone||'');setFEmail(c.email||'');setFBranch(c.branch_id||'');setPanelOpen(true) }
  const close = () => { setPanelOpen(false);setEditing(null) }

  const save = async () => {
    if(!fName.trim()) return; setSaving(true)
    const p = { name:fName, phone:fPhone||null, email:fEmail||null, branch_id:fBranch||null, tenant_id:profile?.tenant_id }
    const {error} = editing ? await supabase.from('customers').update(p).eq('id',editing.id) : await supabase.from('customers').insert(p)
    if(error) addToast(error.message,'error')
    else { addToast(editing?'Updated':'Created','success');close();fetchAll() }
    setSaving(false)
  }

  const filtered = customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||(c.phone||'').includes(search)||(c.email||'').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1"><Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers..." className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"/></div>
        <button onClick={panelOpen?close:openAdd} className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto">{panelOpen?<X size={18}/>:<Plus size={18}/>} {panelOpen?'Close panel':'Add customer'}</button>
      </div>
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">{editing?'Edit customer':'New customer'}</h3>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Full name</label><div className="relative"><UserCircle size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" value={fName} onChange={e=>setFName(e.target.value)} placeholder="Customer name" className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Phone</label><div className="relative"><Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"/><input type="tel" value={fPhone} onChange={e=>setFPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div></div>
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Email</label><div className="relative"><Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"/><input type="email" value={fEmail} onChange={e=>setFEmail(e.target.value)} placeholder="customer@email.com" className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div></div>
            </div>
            <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Branch</label><select value={fBranch} onChange={e=>setFBranch(e.target.value)} className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"><option value="">No branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={close} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial">Cancel</button>
            <button onClick={save} disabled={!fName.trim()||saving} className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto">{saving?'Saving...':editing?'Update':'Create customer'}</button>
          </div>
        </div>
      )}
      {loading?(
        <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-[2rem]"/>)}</div>
      ):filtered.length===0?<div/>:(
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(c=>(
              <button key={c.id} onClick={()=>openEdit(c)} className="w-full text-left p-4 md:p-8 px-6 md:px-12 hover:bg-slate-50 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm text-slate-600 shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="text-slate-900 truncate">{c.name}</p><p className="text-sm text-slate-500 truncate">{c.phone||c.email||''}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
