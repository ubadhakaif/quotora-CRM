'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wrench, Search, IndianRupee } from 'lucide-react'

interface AccType { id: string; name: string }
interface Accessory {
  id: string; name: string; price: number; type_id: string | null
  image_url: string | null; accessory_types?: { name: string } | null
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export default function BranchAccessoriesPage() {
  const [items, setItems] = useState<Accessory[]>([])
  const [types, setTypes] = useState<AccType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const [a, t] = await Promise.all([
        supabase.from('accessories').select('*, accessory_types(name)').eq('is_active', true).order('name'),
        supabase.from('accessory_types').select('*').eq('is_active', true).order('name'),
      ])
      if (a.data) setItems(a.data)
      if (t.data) setTypes(t.data)
      setLoading(false)
    }
    fetch()
  }, []) // eslint-disable-line

  const getType = (a: Accessory) => {
    if (a.accessory_types && typeof a.accessory_types === 'object' && 'name' in a.accessory_types) {
      return (a.accessory_types as { name: string }).name
    }
    return null
  }

  const filtered = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = selectedType === '' || i.type_id === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Search & Type Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accessories..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType('')}
            className={`px-5 py-3 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
              selectedType === ''
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Types
          </button>
          {types.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-5 py-3 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                selectedType === t.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Accessories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton h-48 rounded-[2rem]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          <Wrench className="mx-auto text-slate-300 mb-4" size={42} />
          <p className="text-sm font-medium">No accessories found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div
              key={a.id}
              className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden hover:border-slate-300 transition-all group"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                {a.image_url ? (
                  <img
                    src={a.image_url}
                    alt={a.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <Wrench size={36} className="stroke-[1.2]" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">No Image</span>
                  </div>
                )}
                {getType(a) && (
                  <span className="absolute top-4 right-4 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 bg-white/95 text-slate-800 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
                    {getType(a)}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="p-6">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">{a.name}</h3>
                <div className="mt-3 flex items-center gap-1 text-slate-800">
                  <IndianRupee size={14} className="stroke-[2.5]" />
                  <span className="text-lg font-black tracking-tight">
                    {a.price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
