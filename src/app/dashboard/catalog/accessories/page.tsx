'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { MediaUpload } from '@/components/ui/MediaUpload'
import { Plus, X, Wrench, Search, Tag } from 'lucide-react'

interface AccType { id: string; name: string }
interface Accessory {
  id: string; name: string; price: number; type_id: string|null
  image_url: string|null; images?: string[] | null; video_url?: string | null
  accessory_types?: {name:string}|null
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)

interface AccessoriesTabProps {
  refreshTrigger?: number
}

export default function AccessoriesTab({ refreshTrigger = 0 }: AccessoriesTabProps) {
  const [items, setItems] = useState<Accessory[]>([])
  const [types, setTypes] = useState<AccType[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Accessory|null>(null)
  const [search, setSearch] = useState('')
  const [fName, setFName] = useState(''); const [fPrice, setFPrice] = useState('')
  const [fTypeId, setFTypeId] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [addType, setAddType] = useState(false); const [newType, setNewType] = useState('')
  const { profile } = useAuth(); const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    setLoading(true)
    const [a, t] = await Promise.all([
      supabase.from('accessories').select('*, accessory_types(name)').eq('is_active',true).order('name'),
      supabase.from('accessory_types').select('*').eq('is_active',true).order('name'),
    ])
    if(a.data) setItems(a.data); if(t.data) setTypes(t.data)
    setLoading(false)
  }
  useEffect(()=>{fetchAll()}, []) // eslint-disable-line

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchAll()
    }
  }, [refreshTrigger]) // eslint-disable-line

  const openAdd = () => { setEditing(null);setFName('');setFPrice('');setFTypeId('');setImages([]);setVideoUrl(null);setPanelOpen(true) }
  const openEdit = (a: Accessory) => { setEditing(a);setFName(a.name);setFPrice(String(a.price));setFTypeId(a.type_id||'');setImages(a.images || (a.image_url ? [a.image_url] : []));setVideoUrl(a.video_url || null);setPanelOpen(true) }
  const close = () => { setPanelOpen(false);setEditing(null) }

  const save = async () => {
    if(!fName.trim()) return; setSaving(true)
    const p = {
      name:fName,
      price:parseFloat(fPrice)||0,
      type_id:fTypeId||null,
      images,
      video_url:videoUrl,
      image_url:images.length > 0 ? images[0] : null,
      tenant_id:profile?.tenant_id
    }
    const {error} = editing ? await supabase.from('accessories').update(p).eq('id',editing.id) : await supabase.from('accessories').insert(p)
    if(error) addToast(error.message,'error')
    else { addToast(editing?'Updated':'Created','success');close();fetchAll() }
    setSaving(false)
  }

  const saveType = async () => {
    if(!newType.trim()) return
    const {error}=await supabase.from('accessory_types').insert({tenant_id:profile?.tenant_id,name:newType})
    if(error)addToast(error.message,'error');else{addToast('Type added','success');setNewType('');setAddType(false);fetchAll()}
  }

  const filtered = items.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()))
  const getType = (a: Accessory) => a.accessory_types&&typeof a.accessory_types==='object'&&'name' in a.accessory_types?(a.accessory_types as {name:string}).name:null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1"><Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search accessories..." className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"/></div>
        <button onClick={panelOpen?close:openAdd} className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto">{panelOpen?<X size={18}/>:<Plus size={18}/>} {panelOpen?'Close panel':'Add accessory'}</button>
      </div>
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">{editing?'Edit accessory':'New accessory'}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Accessory name</label><input type="text" value={fName} onChange={e=>setFName(e.target.value)} placeholder="e.g. Floor Mats" className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div>
              <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Price (₹)</label><input type="number" value={fPrice} onChange={e=>setFPrice(e.target.value)} placeholder="0" className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/></div>
            </div>
            <div className="space-y-2"><label className="text-sm text-slate-600 pl-4">Accessory type</label><div className="flex gap-2"><select value={fTypeId} onChange={e=>setFTypeId(e.target.value)} className="flex-1 rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"><option value="">No type</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button onClick={()=>setAddType(!addType)} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 hover:bg-slate-50 transition-colors shrink-0"><Plus size={18}/></button></div></div>
            {addType&&<div className="flex gap-2"><input type="text" value={newType} onChange={e=>setNewType(e.target.value)} placeholder="e.g. Protection, Comfort" className="flex-1 rounded-full py-3 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"/><button onClick={saveType} disabled={!newType.trim()} className="bg-slate-900 text-white rounded-full px-5 py-3 text-sm hover:bg-slate-800 disabled:opacity-50">Add</button></div>}
            <MediaUpload
              images={images}
              onImagesChange={setImages}
              videoUrl={videoUrl}
              onVideoChange={setVideoUrl}
              folder="accessories"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={close} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial">Cancel</button>
            <button onClick={save} disabled={!fName.trim()||saving} className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto">{saving?'Saving...':editing?'Update':'Create'}</button>
          </div>
        </div>
      )}
      {loading?(
        <div className="space-y-4">
          {[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-[1.5rem]"/>)}
        </div>
      ):filtered.length===0?(
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No accessories found matching search criteria.
        </div>
      ):(
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Accessory</th>
                  <th className="py-5 px-6">Accessory Type</th>
                  <th className="py-5 px-6">Price</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(a => {
                  const type = getType(a)
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Accessory with small scale image */}
                      <td className="py-4 px-6 md:px-8">
                        <div className="flex items-center gap-3">
                          {a.image_url ? (
                            <img
                              src={a.image_url}
                              alt={a.name}
                              className="w-12 h-12 rounded object-contain bg-slate-50 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <Wrench size={16} />
                            </div>
                          )}
                          <span className="font-semibold text-slate-900">{a.name}</span>
                        </div>
                      </td>

                      {/* Accessory Type */}
                      <td className="py-4 px-6">
                        {type ? (
                          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1 font-semibold">
                            {type}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No Type</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {formatINR(a.price)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 md:pr-8 text-right">
                        <button
                          onClick={() => openEdit(a)}
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
