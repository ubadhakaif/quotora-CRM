'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, Fuel, Search } from 'lucide-react'

interface FuelType {
  id: string
  name: string
  created_at: string
}

export default function FuelsTab() {
  const [fuels, setFuels] = useState<FuelType[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<FuelType | null>(null)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  
  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchFuels = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('fuel_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      addToast(error.message, 'error')
    } else if (data) {
      setFuels(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFuels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAdd = () => {
    setEditing(null)
    setName('')
    setPanelOpen(true)
  }

  const openEdit = (f: FuelType) => {
    setEditing(f)
    setName(f.name)
    setPanelOpen(true)
  }

  const close = () => {
    setPanelOpen(false)
    setEditing(null)
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)

    const payload = {
      name: name.trim(),
      tenant_id: profile?.tenant_id,
    }

    const { error } = editing
      ? await supabase.from('fuel_types').update(payload).eq('id', editing.id)
      : await supabase.from('fuel_types').insert(payload)

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast(editing ? 'Fuel Type updated' : 'Fuel Type created', 'success')
      close()
      fetchFuels()
    }
    setSaving(false)
  }

  const filtered = fuels.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search fuel types..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <button
          onClick={panelOpen ? close : openAdd}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto shrink-0"
        >
          {panelOpen ? <X size={18} /> : <Plus size={18} />} {panelOpen ? 'Close panel' : 'Add Fuel Type'}
        </button>
      </div>

      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">{editing ? 'Edit Fuel Type' : 'New Fuel Type'}</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Fuel Type Name</label>
              <div className="relative">
                <Fuel size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Petrol, Diesel, Electric, Hybrid"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={close}
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!name.trim() || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Create Fuel Type'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-20 rounded-[2rem]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 text-center text-slate-500">
          No fuel types found. Add your first one to get started!
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(f => (
              <button
                key={f.id}
                onClick={() => openEdit(f)}
                className="w-full text-left p-6 md:p-8 px-8 md:px-12 hover:bg-slate-50 transition-colors flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-950 transition-colors">
                  <Fuel size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-950 font-bold">{f.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Added: {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
