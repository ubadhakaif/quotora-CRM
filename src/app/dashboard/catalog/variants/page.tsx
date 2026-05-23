'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { MediaUpload } from '@/components/ui/MediaUpload'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Plus, X, Layers, Search, Fuel, Settings } from 'lucide-react'

interface Model { id: string; name: string }
interface FuelType { id: string; name: string }
interface TransType { id: string; name: string }
interface Variant {
  id: string; name: string; model_id: string; price: number
  fuel_type_id: string|null; transmission_type_id: string|null
  fuel_type_ids?: string[] | null; transmission_type_ids?: string[] | null
  variant_order: number; image_url: string|null
  images?: string[] | null; video_url?: string | null
  brochure_url?: string | null
  models?: { name: string } | null
  fuel_types?: { name: string } | null
  transmission_types?: { name: string } | null
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)

interface VariantsTabProps {
  refreshTrigger?: number
}

export default function VariantsTab({ refreshTrigger = 0 }: VariantsTabProps) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [fuels, setFuels] = useState<FuelType[]>([])
  const [trans, setTrans] = useState<TransType[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Variant|null>(null)
  const [search, setSearch] = useState('')
  const [fName, setFName] = useState(''); const [fModelId, setFModelId] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [fFuelIds, setFFuelIds] = useState<string[]>([])
  const [fTransIds, setFTransIds] = useState<string[]>([])
  const [fOrder, setFOrder] = useState('0')
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string|null>(null)
  const [brochureUrl, setBrochureUrl] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [addFuel, setAddFuel] = useState(false); const [newFuel, setNewFuel] = useState('')
  const [addTrans, setAddTrans] = useState(false); const [newTrans, setNewTrans] = useState('')
  const { profile } = useAuth(); const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [v,m,f,t] = await Promise.all([
      supabase.from('variants').select('*, models(name), fuel_types(name), transmission_types(name)').eq('is_active',true).order('variant_order'),
      supabase.from('models').select('id,name').eq('is_active',true).order('name'),
      supabase.from('fuel_types').select('*').eq('is_active',true).order('name'),
      supabase.from('transmission_types').select('*').eq('is_active',true).order('name'),
    ])
    if(v.data) setVariants(v.data); if(m.data) setModels(m.data)
    if(f.data) setFuels(f.data); if(t.data) setTrans(t.data)
    setLoading(false)
  }
  useEffect(()=>{fetchAll()}, []) // eslint-disable-line

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAll()
    }
  }, [refreshTrigger]) // eslint-disable-line

  const openAdd = () => { setEditing(null);setFName('');setFModelId('');setFPrice('');setFFuelIds([]);setFTransIds([]);setFOrder('0');setImages([]);setVideoUrl(null);setBrochureUrl(null);setPanelOpen(true) }
  const openEdit = (v: Variant) => { setEditing(v);setFName(v.name);setFModelId(v.model_id);setFPrice(String(v.price));setFFuelIds(v.fuel_type_ids || (v.fuel_type_id ? [v.fuel_type_id] : []));setFTransIds(v.transmission_type_ids || (v.transmission_type_id ? [v.transmission_type_id] : []));setFOrder(String(v.variant_order));setImages(v.images || (v.image_url ? [v.image_url] : []));setVideoUrl(v.video_url || null);setBrochureUrl(v.brochure_url || null);setPanelOpen(true) }
  const close = () => { setPanelOpen(false);setEditing(null) }

  const save = async () => {
    if(!fName.trim()||!fModelId) return; setSaving(true)
    const p = {
      name:fName,
      model_id:fModelId,
      price:parseFloat(fPrice)||0,
      fuel_type_ids:fFuelIds,
      transmission_type_ids:fTransIds,
      fuel_type_id:fFuelIds.length > 0 ? fFuelIds[0] : null,
      transmission_type_id:fTransIds.length > 0 ? fTransIds[0] : null,
      variant_order:parseInt(fOrder)||0,
      images,
      video_url:videoUrl,
      brochure_url:brochureUrl || null,
      image_url:images.length > 0 ? images[0] : null,
      tenant_id:profile?.tenant_id
    }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Price (₹)</label><input type="number" value={fPrice} onChange={e=>setFPrice(e.target.value)} placeholder="0" className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div>
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Order</label><input type="number" value={fOrder} onChange={e=>setFOrder(e.target.value)} className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Fuel types</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-[1rem]">
                  {fuels.map(f => {
                    const isSelected = fFuelIds.includes(f.id)
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setFFuelIds(prev =>
                            prev.includes(f.id)
                              ? prev.filter(id => id !== f.id)
                              : [...prev, f.id]
                          )
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {f.name}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setAddFuel(!addFuel)}
                    className="px-3 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add new
                  </button>
                </div>
                {addFuel && (
                  <div className="flex gap-2 pl-4 pt-1">
                    <input type="text" value={newFuel} onChange={e=>setNewFuel(e.target.value)} placeholder="e.g. Petrol, Diesel, EV" className="flex-1 rounded-full py-3 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none" />
                    <button type="button" onClick={saveFuel} disabled={!newFuel.trim()} className="bg-slate-900 text-white rounded-full px-5 py-3 text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer">Add</button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Transmission types</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-[1rem]">
                  {trans.map(t => {
                    const isSelected = fTransIds.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setFTransIds(prev =>
                            prev.includes(t.id)
                              ? prev.filter(id => id !== t.id)
                              : [...prev, t.id]
                          )
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setAddTrans(!addTrans)}
                    className="px-3 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add new
                  </button>
                </div>
                {addTrans && (
                  <div className="flex gap-2 pl-4 pt-1">
                    <input type="text" value={newTrans} onChange={e=>setNewTrans(e.target.value)} placeholder="e.g. Manual, Automatic" className="flex-1 rounded-full py-3 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none" />
                    <button type="button" onClick={saveTrans} disabled={!newTrans.trim()} className="bg-slate-900 text-white rounded-full px-5 py-3 text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer">Add</button>
                  </div>
                )}
              </div>
            </div>
            <MediaUpload
              images={images}
              onImagesChange={setImages}
              videoUrl={videoUrl}
              onVideoChange={setVideoUrl}
              folder="variants"
            />
            <ImageUpload
              value={brochureUrl}
              onChange={setBrochureUrl}
              folder="documents"
              accept="application/pdf"
              label="Variant Brochure (PDF)"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={close} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial">Cancel</button>
            <button onClick={save} disabled={!fName.trim()||!fModelId||saving} className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto">{saving?'Saving...':editing?'Update':'Create variant'}</button>
          </div>
        </div>
      )}
      {loading?(
        <div className="space-y-4">
          {[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-[1.5rem]"/>)}
        </div>
      ):filtered.length===0?(
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No variants found matching search criteria.
        </div>
      ):(
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Variant</th>
                  <th className="py-5 px-6">Model Series</th>
                  <th className="py-5 px-6">Specifications</th>
                  <th className="py-5 px-6">Base Price</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(v => {
                  const modelName = v.models && typeof v.models === 'object' && 'name' in v.models ? (v.models as { name: string }).name : 'Unknown'
                  
                  const fuelNames: string[] = []
                  if (v.fuel_type_ids && Array.isArray(v.fuel_type_ids)) {
                    v.fuel_type_ids.forEach(id => {
                      const found = fuels.find(f => f.id === id)
                      if (found) fuelNames.push(found.name)
                    })
                  } else if (v.fuel_types && typeof v.fuel_types === 'object' && 'name' in v.fuel_types) {
                    fuelNames.push((v.fuel_types as { name: string }).name)
                  }

                  const transNames: string[] = []
                  if (v.transmission_type_ids && Array.isArray(v.transmission_type_ids)) {
                    v.transmission_type_ids.forEach(id => {
                      const found = trans.find(t => t.id === id)
                      if (found) transNames.push(found.name)
                    })
                  } else if (v.transmission_types && typeof v.transmission_types === 'object' && 'name' in v.transmission_types) {
                    transNames.push((v.transmission_types as { name: string }).name)
                  }

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Variant with small scale image & order */}
                      <td className="py-4 px-6 md:px-8">
                        <div className="flex items-center gap-3">
                          {v.image_url ? (
                            <img
                              src={v.image_url}
                              alt={v.name}
                              className="w-12 h-12 rounded object-contain bg-slate-50 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <Layers size={16} />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{v.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Pos #{v.variant_order}</span>
                          </div>
                        </div>
                      </td>

                      {/* Model Series */}
                      <td className="py-4 px-6 font-medium text-slate-600">
                        {modelName}
                      </td>

                      {/* Specifications */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {fuelNames.map(name => (
                            <span key={name} className="text-[10px] bg-blue-50 text-blue-600 rounded-full px-2.5 py-0.5 font-semibold">
                              {name}
                            </span>
                          ))}
                          {transNames.map(name => (
                            <span key={name} className="text-[10px] bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 font-semibold">
                              {name}
                            </span>
                          ))}
                          {fuelNames.length === 0 && transNames.length === 0 && (
                            <span className="text-slate-400 italic text-xs">None</span>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {formatINR(v.price)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 md:pr-8 text-right">
                        <button
                          onClick={() => openEdit(v)}
                          className="bg-slate-900 text-white rounded-full px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
