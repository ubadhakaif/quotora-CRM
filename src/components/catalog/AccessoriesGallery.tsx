'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wrench, Search, X, IndianRupee, Tag, Info, Play, Image as ImageIcon } from 'lucide-react'

interface AccType { id: string; name: string }
interface Accessory {
  id: string; name: string; price: number; type_id: string | null
  image_url: string | null; images?: string[] | null; video_url?: string | null
  accessory_types?: { name: string } | null
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export function AccessoriesGallery() {
  const [items, setItems] = useState<Accessory[]>([])
  const [types, setTypes] = useState<AccType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')

  // Accessory Drawer States
  const [selectedAccessory, setSelectedAccessory] = useState<Accessory | null>(null)
  const [activeImage, setActiveImage] = useState<string>('')
  const [isPlayingVideo, setIsPlayingVideo] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true)
      const [aRes, tRes] = await Promise.all([
        supabase.from('accessories').select('*, accessory_types(name)').eq('is_active', true).order('name'),
        supabase.from('accessory_types').select('*').eq('is_active', true).order('name'),
      ])
      if (aRes.data) setItems(aRes.data)
      if (tRes.data) setTypes(tRes.data)
      setLoading(false)
    }
    fetchCatalog()
  }, []) // eslint-disable-line

  const handleSelectAccessory = (acc: Accessory) => {
    setSelectedAccessory(acc)
    const accImages = acc.images || (acc.image_url ? [acc.image_url] : [])
    setActiveImage(accImages[0] || '')
    setIsPlayingVideo(false)
  }

  const getTypeLabel = (acc: Accessory) => {
    return acc.accessory_types && typeof acc.accessory_types === 'object' && 'name' in acc.accessory_types
      ? (acc.accessory_types as { name: string }).name
      : null
  }

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = selectedType === '' || i.type_id === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-8 pb-12 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] min-h-screen p-6 md:p-12">
      {/* Search & Category Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center max-w-7xl mx-auto">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accessories, mats, covers..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedType('')}
            className={`px-6 py-4 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              selectedType === ''
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Accessories
          </button>
          {types.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-6 py-4 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="skeleton h-72 rounded-[3rem]" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-12 text-center text-slate-500 max-w-7xl mx-auto">
          <Wrench className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-sm font-medium">No accessories found matching criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto animate-in fade-in duration-300">
          {filteredItems.map(acc => {
            const accImages = acc.images || (acc.image_url ? [acc.image_url] : [])
            const typeName = getTypeLabel(acc)
            return (
              <div
                key={acc.id}
                onClick={() => handleSelectAccessory(acc)}
                className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden hover:border-slate-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Accessory Image Area */}
                  <div className="relative aspect-square bg-slate-50 overflow-hidden border-b border-slate-100 flex items-center justify-center">
                    {accImages.length > 0 ? (
                      <img
                        src={accImages[0]}
                        alt={acc.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Wrench size={48} className="stroke-[1.2]" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">No Media</span>
                      </div>
                    )}

                    {/* Multi-media Indicators */}
                    <div className="absolute bottom-4 left-4 flex gap-1.5">
                      {accImages.length > 1 && (
                        <span className="text-[9px] bg-slate-900/80 text-white rounded-full px-2 py-0.5 font-bold uppercase backdrop-blur-xs flex items-center gap-1 border border-white/10">
                          <ImageIcon size={10} />
                          {accImages.length}
                        </span>
                      )}
                      {acc.video_url && (
                        <span className="text-[9px] bg-emerald-600/90 text-white rounded-full px-2 py-0.5 font-bold uppercase backdrop-blur-xs flex items-center gap-1 border border-white/10">
                          <Play size={10} className="fill-white" />
                          Video
                        </span>
                      )}
                    </div>

                    {/* Category Tag */}
                    {typeName && (
                      <span className="absolute top-4 right-4 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 bg-white/95 text-slate-800 rounded-full border border-slate-200 backdrop-blur-sm">
                        {typeName}
                      </span>
                    )}
                  </div>

                  {/* Accessory Details */}
                  <div className="p-6">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-slate-950 transition-colors line-clamp-2">
                      {acc.name}
                    </h3>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Price</span>
                    <span className="text-slate-900 font-extrabold flex items-center">
                      <IndianRupee size={12} className="stroke-[2.5] mr-0.5" />
                      {acc.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Accessory Detail Drawer */}
      {selectedAccessory && (() => {
        const accImages = selectedAccessory.images || (selectedAccessory.image_url ? [selectedAccessory.image_url] : [])
        const typeName = getTypeLabel(selectedAccessory)
        return (
          <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
            <div className="w-full max-w-xl bg-white h-full flex flex-col justify-between animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {typeName && (
                    <span className="text-xs uppercase tracking-wider font-extrabold px-3 py-1 bg-slate-100 text-slate-800 rounded-full border border-slate-200">
                      {typeName}
                    </span>
                  )}
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {selectedAccessory.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedAccessory(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body Scroll */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                {/* Multi-media Display Section */}
                <div className="space-y-3">
                  <div className="relative aspect-square bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-200 flex items-center justify-center">
                    {isPlayingVideo && selectedAccessory.video_url ? (
                      /* Video Player View */
                      <div className="w-full h-full bg-black relative">
                        <video
                          src={selectedAccessory.video_url}
                          controls
                          autoPlay
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => setIsPlayingVideo(false)}
                          className="absolute top-4 right-4 bg-slate-900/90 text-white rounded-full p-2 hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : activeImage ? (
                      /* Active Image View */
                      <div className="w-full h-full relative">
                        <img
                          src={activeImage}
                          alt={selectedAccessory.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Play Video Trigger Overlay */}
                        {selectedAccessory.video_url && (
                          <button
                            onClick={() => setIsPlayingVideo(true)}
                            className="absolute bottom-4 right-4 bg-emerald-600 text-white font-bold rounded-full py-2.5 px-5 text-xs hover:bg-emerald-500 transition-all flex items-center gap-2 cursor-pointer border border-emerald-500/10"
                          >
                            <Play size={12} className="fill-white" />
                            Play Video
                          </button>
                        )}
                      </div>
                    ) : (
                      /* No Media Fallback */
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Wrench size={64} className="stroke-[1.2]" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">No Media Available</span>
                      </div>
                    )}
                  </div>

                  {/* Carousel Thumbnails */}
                  {!isPlayingVideo && accImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                      {accImages.map((img, idx) => (
                        <button
                          key={img + idx}
                          onClick={() => setActiveImage(img)}
                          className={`w-20 h-20 rounded-xl overflow-hidden border shrink-0 transition-all ${
                            activeImage === img
                              ? 'border-slate-900 bg-slate-100 scale-95'
                              : 'border-slate-200 bg-slate-50 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing & Metadata Card */}
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                    <span className="text-xs text-slate-450 uppercase font-extrabold tracking-wider flex items-center gap-1.5">
                      <Tag size={12} /> Pricing
                    </span>
                    <span className="text-xl font-black text-slate-900 flex items-center tracking-tight">
                      <IndianRupee size={16} className="stroke-[2.5]" />
                      {selectedAccessory.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Info size={12} /> Description
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                      High-quality {selectedAccessory.name} catalog record specifically customized for your vehicle model variants, guaranteeing durability, premium appearance, and a seamless snug fit.
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setSelectedAccessory(null)}
                  className="w-full bg-slate-900 text-white font-semibold rounded-full py-4 text-xs hover:bg-slate-800 transition-all cursor-pointer text-center"
                >
                  Close Gallery View
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
