'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, Car, Tag, Search } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface Category { id: string; name: string }
interface Model {
  id: string; name: string; description: string | null
  category_id: string | null; categories?: Category | null
  image_url?: string | null
}

export default function ModelsTab() {
  const [models, setModels] = useState<Model[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [catPanelOpen, setCatPanelOpen] = useState(false)
  const [editing, setEditing] = useState<Model | null>(null)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [catId, setCatId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [newCat, setNewCat] = useState('')
  const [saving, setSaving] = useState(false)
  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetch = async () => {
    setLoading(true)
    const [m, c] = await Promise.all([
      supabase.from('models').select('*, categories(name)').eq('is_active', true).order('created_at'),
      supabase.from('categories').select('*').eq('is_active', true).order('name'),
    ])
    if (m.data) setModels(m.data)
    if (c.data) setCategories(c.data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, []) // eslint-disable-line

  const openAdd = () => { setEditing(null); setName(''); setDesc(''); setCatId(''); setImageUrl(''); setPanelOpen(true) }
  const openEdit = (m: Model) => { setEditing(m); setName(m.name); setDesc(m.description||''); setCatId(m.category_id||''); setImageUrl(m.image_url||''); setPanelOpen(true) }
  const close = () => { setPanelOpen(false); setEditing(null) }

  const save = async () => {
    if (!name.trim()) return; setSaving(true)
    const p = { name, description: desc||null, category_id: catId||null, image_url: imageUrl||null, tenant_id: profile?.tenant_id }
    const { error } = editing
      ? await supabase.from('models').update(p).eq('id', editing.id)
      : await supabase.from('models').insert(p)
    if (error) {
      if (error.code === '42703') {
        addToast('Please apply the 006_models_image.sql migration in your Supabase SQL editor to enable model images.','error')
      } else {
        addToast(error.message,'error')
      }
    }
    else { addToast(editing?'Updated':'Created','success'); close(); fetch() }
    setSaving(false)
  }

  const addCat = async () => {
    if (!newCat.trim()) return
    const { error } = await supabase.from('categories').insert({ tenant_id: profile?.tenant_id, name: newCat })
    if (error) addToast(error.message,'error')
    else { addToast('Category added','success'); setNewCat(''); setCatPanelOpen(false); fetch() }
  }

  const filtered = models.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
  const getCat = (m: Model) => m.categories && typeof m.categories === 'object' && 'name' in m.categories ? (m.categories as Category).name : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="model-search" type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search models..." className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none" />
        </div>
        <button onClick={panelOpen?close:openAdd} className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto">
          {panelOpen?<X size={18}/>:<Plus size={18}/>} {panelOpen?'Close panel':'Add model'}
        </button>
      </div>

      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">{editing?'Edit model':'New model'}</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="model-name" className="text-sm text-slate-600 pl-4">Model name</label>
              <div className="relative"><Car size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="model-name" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Swift, Creta" className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none" /></div>
            </div>
            <div className="space-y-2">
              <label htmlFor="model-desc" className="text-sm text-slate-600 pl-4">Description</label>
              <textarea id="model-desc" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Brief description" rows={2} className="w-full rounded-[1.5rem] py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none resize-none" />
            </div>
            <div className="space-y-2">
              <label htmlFor="model-cat" className="text-sm text-slate-600 pl-4">Category</label>
              <div className="flex gap-2">
                <select id="model-cat" value={catId} onChange={e=>setCatId(e.target.value)} className="flex-1 rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none">
                  <option value="">No category</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={()=>setCatPanelOpen(!catPanelOpen)} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 hover:bg-slate-50 transition-colors shrink-0"><Plus size={18}/></button>
              </div>
            </div>
            {catPanelOpen && (
              <div className="flex gap-2 pl-4">
                <div className="relative flex-1"><Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="e.g. SUV, Sedan" className="w-full rounded-full py-3 pl-11 pr-4 bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none" /></div>
                <button onClick={addCat} disabled={!newCat.trim()} className="bg-slate-900 text-white rounded-full px-5 py-3 text-sm hover:bg-slate-800 transition-colors disabled:opacity-50">Add</button>
              </div>
            )}
            <ImageUpload value={imageUrl} onChange={url => setImageUrl(url || '')} folder="models" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={close} className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 flex items-center justify-start gap-3 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial">Cancel</button>
            <button onClick={save} disabled={!name.trim()||saving} className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto">{saving?'Saving...':editing?'Update':'Create model'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-[2rem]"/>)}</div>
      ) : filtered.length===0 ? <div/> : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(m=>(
              <button key={m.id} onClick={()=>openEdit(m)} className="w-full text-left p-4 md:p-8 px-6 md:px-12 hover:bg-slate-50 transition-colors flex items-center gap-4">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} className="w-12 h-8 rounded-lg object-cover shrink-0 border border-slate-200" />
                ) : (
                  <Car size={18} className="text-slate-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0"><p className="text-slate-900 truncate">{m.name}</p>{m.description&&<p className="text-sm text-slate-500 truncate mt-0.5">{m.description}</p>}</div>
                {getCat(m)&&<span className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1 shrink-0">{getCat(m)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
