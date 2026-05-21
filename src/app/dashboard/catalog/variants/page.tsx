'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Plus, X, Layers, Search, Fuel, Settings } from 'lucide-react'

interface Model { id: string; name: string }
interface FuelType { id: string; name: string }
interface TransType { id: string; name: string }
interface Variant {
  id: string; name: string; model_id: string; price: number
  fuel_type_id: string|null; transmission_type_id: string|null
  variant_order: number; image_url: string|null
  models?: { name: string } | null
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)

export default function VariantsTab() {
  const [variants, setVariants] = useState<Variant[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [fuels, setFuels] = useState<FuelType[]>([])
  const [trans, setTrans] = useState<TransType[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Variant|null>(null)
  const [search, setSearch] = useState('')
  const [fName, setFName] = useState(''); const [fModelId, setFModelId] = useState('')
  const [fPrice, setFPrice] = useState(''); const [fFuelId, setFFuelId] = useState('')
  const [fTransId, setFTransId] = useState(''); const [fOrder, setFOrder] = useState('0')
  const [fImageUrl, setFImageUrl] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [addFuel, setAddFuel] = useState(false); const [newFuel, setNewFuel] = useState('')
  const [addTrans, setAddTrans] = useState(false); const [newTrans, setNewTrans] = useState('')
  const { profile } = useAuth(); const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [v,m,f,t] = await Promise.all([
      supabase.from('variants').select('*, models(name)').eq('is_active',true).order('variant_order'),
      supabase.from('models').select('id,name').eq('is_active',true).order('name'),
      supabase.from('fuel_types').select('*').eq('is_active',true).order('name'),
      supabase.from('transmission_types').select('*').eq('is_active',true).order('name'),
    ])
    if(v.data) setVariants(v.data); if(m.data) setModels(m.data)
    if(f.data) setFuels(f.data); if(t.data) setTrans(t.data)
    setLoading(false)
  }
  useEffect(()=>{fetchAll()}, []) // eslint-disable-line

  const openAdd = () => { setEditing(null);setFName('');setFModelId('');setFPrice('');setFFuelId('');setFTransId('');setFOrder('0');setFImageUrl(null);setPanelOpen(true) }
  const openEdit = (v: Variant) => { setEditing(v);setFName(v.name);setFModelId(v.model_id);setFPrice(String(v.price));setFFuelId(v.fuel_type_id||'');setFTransId(v.transmission_type_id||'');setFOrder(String(v.variant_order));setFImageUrl(v.image_url);setPanelOpen(true) }
  const close = () => { setPanelOpen(false);setEditing(null) }

  const save = async () => {
    if(!fName.trim()||!fModelId) return; setSaving(true)
    const p = { name:fName, model_id:fModelId, price:parseFloat(fPrice)||0, fuel_type_id:fFuelId||null, transmission_type_id:fTransId||null, variant_order:parseInt(fOrder)||0, image_url:fImageUrl, tenant_id:profile?.tenant_id }
    const {error} = editing ? await supabase.from('variants').update(p).eq('id',editing.id) : await supabase.from('variants').insert(p)
    if(error) addToast(error.message,'error')
    else { addToast(editing?'Updated':'Created','success');close();fetchAll() }
    setSaving(false)
  }

  const saveFuel = async () => { if(!newFuel.trim()) return; const {error}=await supabase.from('fuel_types').insert({tenant_id:profile?.tenant_id,name:newFuel}); if(error)addToast(error.message,'error');else{addToast('Added','success');setNewFuel('');setAddFuel(false);fetchAll()} }
  const saveTrans = async () => { if(!newTrans.trim()) return; const {error}=await supabase.from('transmission_types').insert({tenant_id:profile?.tenant_id,name:newTrans}); if(error)addToast(error.message,'error');else{addToast('Added','success');setNewTrans('');setAddTrans(false);fetchAll()} }

  const filtered = variants.filter(v=>v.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1"><Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"/><input id="variant-search" type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search variants..." className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"/></div>
        <button onClick={panelOpen?close:openAdd} className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto">{panelOpen?<X size={18}/>:<Plus size={18}/>} {panelOpen?'Close panel':'Add variant'}</button>
      </div>
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">{editing?'Edit variant':'New variant'}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Variant name</label><input type="text" value={fName} onChange={e=>setFName(e.target.value)} placeholder="e.g. ZXi+" className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div>
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Model</label><select value={fModelId} onChange={e=>setFModelId(e.target.value)} className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"><option value="">Select model</option>{models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Price (₹)</label><input type="number" value={fPrice} onChange={e=>setFPrice(e.target.value)} placeholder="0" className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div>
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Order</label><input type="number" value={fOrder} onChange={e=>setFOrder(e.target.value)} className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div>
            </div>
            {/* Fuel type and Transmission are managed as separate standalone catalog tabs */}
            <ImageUpload value={fImageUrl} onChange={setFImageUrl} folder="variants" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={close} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial">Cancel</button>
            <button onClick={save} disabled={!fName.trim()||!fModelId||saving} className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto">{saving?'Saving...':editing?'Update':'Create variant'}</button>
          </div>
        </div>
      )}
      {loading?(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i=><div key={i} className="skeleton h-60 rounded-[3rem]"/>)}
        </div>
      ):filtered.length===0?<div/>:(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(v=>(
            <button
              key={v.id}
              onClick={()=>openEdit(v)}
              className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden hover:border-slate-300 transition-all flex flex-col h-full group cursor-pointer text-left outline-none"
            >
              {/* Image & Badges area */}
              <div className="relative h-44 w-full bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {v.image_url ? (
                  <img
                    src={v.image_url}
                    alt={v.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                  />
                ) : (
                  <Layers size={32} className="text-slate-300 group-hover:scale-110 transition-transform duration-300 ease-out" />
                )}
                
                {v.models && typeof v.models === 'object' && 'name' in v.models && (
                  <span className="absolute top-4 left-4 text-[10px] bg-white/90 backdrop-blur-sm text-slate-600 border border-slate-200 rounded-full px-3 py-1 font-semibold tracking-wide uppercase select-none">
                    {(v.models as { name: string }).name}
                  </span>
                )}

                <span className="absolute top-4 right-4 text-[10px] bg-slate-900 text-white rounded-full px-2.5 py-1 font-semibold select-none">
                  Pos #{v.variant_order}
                </span>
              </div>

              {/* Text & Price details */}
              <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h4 className="text-slate-900 font-bold text-base leading-snug group-hover:text-slate-950 transition-colors">
                    {v.name}
                  </h4>
                </div>
                
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Base Price</span>
                  <span className="text-base font-bold text-slate-950">{formatINR(v.price)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
