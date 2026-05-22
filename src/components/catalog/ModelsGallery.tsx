'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Layers, Search, X, IndianRupee, Tag, Info, Fuel, Settings2, Play, Image as ImageIcon, ChevronRight } from 'lucide-react'

interface Category { id: string; name: string }
interface Model {
  id: string; name: string; description: string | null
  category_id: string | null; categories?: Category | null
  image_url?: string | null; images?: string[] | null; video_url?: string | null
}
interface FuelType { id: string; name: string }
interface TransmissionType { id: string; name: string }
interface Variant {
  id: string; name: string; price: number
  image_url: string | null; model_id: string
  images?: string[] | null; video_url?: string | null
  fuel_types?: FuelType | null; transmission_types?: TransmissionType | null
}

const formatINR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export function ModelsGallery() {
  const [models, setModels] = useState<Model[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('')
  
  // Model Drawer States
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [modelVariants, setModelVariants] = useState<Variant[]>([])
  const [activeModelImage, setActiveModelImage] = useState<string>('')
  const [isPlayingModelVideo, setIsPlayingModelVideo] = useState(false)

  // Interactive Variant Detail Expansion States
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null)
  const [activeVariantImage, setActiveVariantImage] = useState<Record<string, string>>({})
  const [isPlayingVariantVideo, setIsPlayingVariantVideo] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true)
      const [mRes, cRes, vRes] = await Promise.all([
        supabase.from('models').select('*, categories(name)').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('name'),
        supabase.from('variants').select('*, fuel_types(name), transmission_types(name)').eq('is_active', true).order('price'),
      ])
      if (mRes.data) setModels(mRes.data)
      if (cRes.data) setCategories(cRes.data)
      if (vRes.data) setVariants(vRes.data)
      setLoading(false)
    }
    fetchCatalog()
  }, []) // eslint-disable-line

  const handleSelectModel = (model: Model) => {
    setSelectedModel(model)
    const filteredVariants = variants.filter(v => v.model_id === model.id)
    setModelVariants(filteredVariants)
    
    // Set initial active image for the model
    const modelImages = model.images || (model.image_url ? [model.image_url] : [])
    setActiveModelImage(modelImages[0] || '')
    setIsPlayingModelVideo(false)
    setExpandedVariantId(null)
    setActiveVariantImage({})
    setIsPlayingVariantVideo({})
  }

  const getCatName = (m: Model) => {
    return m.categories && typeof m.categories === 'object' && 'name' in m.categories
      ? (m.categories as Category).name
      : 'Standard'
  }

  const filteredModels = models.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                          (m.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesCat = selectedCat === '' || m.category_id === selectedCat
    return matchesSearch && matchesCat
  })

  // Expand variant handler
  const toggleVariantExpand = (v: Variant) => {
    if (expandedVariantId === v.id) {
      setExpandedVariantId(null)
    } else {
      setExpandedVariantId(v.id)
      const vImages = v.images || (v.image_url ? [v.image_url] : [])
      if (vImages.length > 0) {
        setActiveVariantImage(prev => ({ ...prev, [v.id]: vImages[0] }))
      }
      setIsPlayingVariantVideo(prev => ({ ...prev, [v.id]: false }))
    }
  }

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
            placeholder="Search vehicles, SUV, hatchbacks..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCat('')}
            className={`px-6 py-4 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              selectedCat === ''
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-6 py-4 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                selectedCat === cat.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton h-80 rounded-[3rem]" />
          ))}
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-12 text-center text-slate-500 max-w-7xl mx-auto">
          <Car className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-sm font-medium">No vehicles found matching criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto animate-in fade-in duration-300">
          {filteredModels.map(model => {
            const modelImages = model.images || (model.image_url ? [model.image_url] : [])
            return (
              <div
                key={model.id}
                onClick={() => handleSelectModel(model)}
                className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden hover:border-slate-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Model Image area */}
                  <div className="relative aspect-[16/10] bg-slate-50 overflow-hidden border-b border-slate-100 flex items-center justify-center">
                    {modelImages.length > 0 ? (
                      <img
                        src={modelImages[0]}
                        alt={model.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Car size={48} className="stroke-[1.2]" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">No Media</span>
                      </div>
                    )}
                    
                    {/* Multi-media Indicators */}
                    <div className="absolute bottom-4 left-4 flex gap-1.5">
                      {modelImages.length > 1 && (
                        <span className="text-[9px] bg-slate-900/80 text-white rounded-full px-2 py-0.5 font-bold uppercase backdrop-blur-xs flex items-center gap-1 border border-white/10">
                          <ImageIcon size={10} />
                          {modelImages.length} Images
                        </span>
                      )}
                      {model.video_url && (
                        <span className="text-[9px] bg-emerald-600/90 text-white rounded-full px-2 py-0.5 font-bold uppercase backdrop-blur-xs flex items-center gap-1 border border-white/10">
                          <Play size={10} className="fill-white" />
                          Video
                        </span>
                      )}
                    </div>

                    {/* Category Tag */}
                    <span className="absolute top-4 right-4 text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 bg-white/95 text-slate-800 rounded-full border border-slate-200 shadow-none backdrop-blur-sm">
                      {getCatName(model)}
                    </span>
                  </div>

                  {/* Model Details */}
                  <div className="p-8">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-slate-950 transition-colors">
                      {model.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {model.description || 'Premium design and engineering with state-of-the-art performance.'}
                    </p>
                  </div>
                </div>

                <div className="p-8 pt-0">
                  <div className="border-t border-slate-100 pt-5 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Available variants</span>
                    <span className="bg-slate-50 text-slate-800 rounded-full px-3 py-1 font-bold border border-slate-100">
                      {variants.filter(v => v.model_id === model.id).length}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Model Detail Drawer with Swipable Carousels and Video Players */}
      {selectedModel && (() => {
        const modelImages = selectedModel.images || (selectedModel.image_url ? [selectedModel.image_url] : [])
        return (
          <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
            <div className="w-full max-w-2xl bg-white h-full flex flex-col justify-between animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider font-extrabold px-3 py-1 bg-slate-100 text-slate-800 rounded-full border border-slate-200">
                    {getCatName(selectedModel)}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {selectedModel.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedModel(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body Scroll */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                {/* ─── Premium Multi-media Display Section ─── */}
                <div className="space-y-3">
                  <div className="relative aspect-[16/9] bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-200 flex items-center justify-center">
                    {isPlayingModelVideo && selectedModel.video_url ? (
                      /* Video Player View */
                      <div className="w-full h-full bg-black relative">
                        <video
                          src={selectedModel.video_url}
                          controls
                          autoPlay
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => setIsPlayingModelVideo(false)}
                          className="absolute top-4 right-4 bg-slate-900/90 text-white rounded-full p-2 hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : activeModelImage ? (
                      /* Active Image View */
                      <div className="w-full h-full relative">
                        <img
                          src={activeModelImage}
                          alt={selectedModel.name}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Play Video Trigger Overlay */}
                        {selectedModel.video_url && (
                          <button
                            onClick={() => setIsPlayingModelVideo(true)}
                            className="absolute bottom-4 right-4 bg-emerald-600 text-white font-bold rounded-full py-2.5 px-5 text-xs hover:bg-emerald-500 transition-all flex items-center gap-2 cursor-pointer shadow-none border border-emerald-500/10"
                          >
                            <Play size={12} className="fill-white" />
                            Play Video
                          </button>
                        )}
                      </div>
                    ) : (
                      /* No Media Fallback */
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Car size={64} className="stroke-[1.2]" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">No Media Available</span>
                      </div>
                    )}
                  </div>

                  {/* Carousel Thumbnails */}
                  {!isPlayingModelVideo && modelImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
                      {modelImages.map((img, idx) => (
                        <button
                          key={img + idx}
                          onClick={() => setActiveModelImage(img)}
                          className={`w-20 h-14 rounded-xl overflow-hidden border shrink-0 transition-all ${
                            activeModelImage === img
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

                {/* Model Description */}
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Info size={12} /> About Model
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {selectedModel.description || 'Premium design and engineering with state-of-the-art performance.'}
                  </p>
                </div>

                {/* Variants Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 pl-2">Available Variants & Specifications</h3>
                  {modelVariants.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-[2rem] p-8 text-center text-slate-400 text-xs">
                      No active variants declared for this model.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {modelVariants.map(variant => {
                        const isExpanded = expandedVariantId === variant.id
                        const vImages = variant.images || (variant.image_url ? [variant.image_url] : [])
                        const hasVideo = !!variant.video_url
                        const currentActiveVImage = activeVariantImage[variant.id] || vImages[0]
                        const isPlayingVVideo = isPlayingVariantVideo[variant.id] || false

                        return (
                          <div
                            key={variant.id}
                            className={`bg-white border rounded-[2rem] overflow-hidden transition-all duration-300 ${
                              isExpanded ? 'border-slate-350 p-6' : 'border-slate-200 p-5 hover:border-slate-300'
                            }`}
                          >
                            {/* Variant Primary Row */}
                            <div
                              onClick={() => toggleVariantExpand(variant)}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                            >
                              <div className="flex items-center gap-4">
                                {variant.image_url ? (
                                  <img
                                    src={variant.image_url}
                                    alt={variant.name}
                                    className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                                    <Layers size={16} />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-950 text-sm">{variant.name}</p>
                                    <ChevronRight
                                      size={14}
                                      className={`text-slate-400 transition-transform duration-300 ${
                                        isExpanded ? 'rotate-95' : ''
                                      }`}
                                    />
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                                    {variant.fuel_types && (
                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                        <Fuel size={10} className="text-slate-400" />
                                        {(variant.fuel_types as FuelType).name}
                                      </span>
                                    )}
                                    {variant.transmission_types && (
                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                        <Settings2 size={10} className="text-slate-400" />
                                        {(variant.transmission_types as TransmissionType).name}
                                      </span>
                                    )}
                                    {(vImages.length > 1 || hasVideo) && (
                                      <span className="text-[9px] text-slate-600 font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-250 flex items-center gap-0.5">
                                        + Media
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 flex sm:flex-col items-center sm:items-end justify-between">
                                <span className="text-[10px] text-slate-400 font-medium block sm:mb-0.5">Ex-Showroom Price</span>
                                <span className="text-base font-black text-slate-900 flex items-center tracking-tight">
                                  <IndianRupee size={14} className="stroke-[2.5]" />
                                  {variant.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            {/* ─── Expandable Variant Media Slider Panel ─── */}
                            {isExpanded && (vImages.length > 0 || hasVideo) && (
                              <div className="mt-5 border-t border-slate-100 pt-5 space-y-4 animate-in fade-in duration-300">
                                <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-450 pl-1">Variant Gallery & Preview</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Media display box */}
                                  <div className="relative aspect-[16/10] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center">
                                    {isPlayingVVideo && variant.video_url ? (
                                      <div className="w-full h-full bg-black relative">
                                        <video src={variant.video_url} controls autoPlay className="w-full h-full object-contain" />
                                        <button
                                          onClick={() => setIsPlayingVariantVideo(prev => ({ ...prev, [variant.id]: false }))}
                                          className="absolute top-2 right-2 bg-slate-900/90 text-white rounded-full p-1.5 hover:bg-slate-700 transition-colors cursor-pointer"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    ) : currentActiveVImage ? (
                                      <div className="w-full h-full relative">
                                        <img src={currentActiveVImage} alt={variant.name} className="w-full h-full object-cover" />
                                        {hasVideo && (
                                          <button
                                            onClick={() => setIsPlayingVariantVideo(prev => ({ ...prev, [variant.id]: true }))}
                                            className="absolute bottom-2 right-2 bg-emerald-600 text-white font-bold rounded-full py-1.5 px-3 text-[10px] hover:bg-emerald-500 transition-all flex items-center gap-1.5 border border-emerald-550/10 cursor-pointer"
                                          >
                                            <Play size={10} className="fill-white" />
                                            Play
                                          </button>
                                        )}
                                      </div>
                                    ) : null}
                                  </div>

                                  {/* Right side thumbnails lists */}
                                  <div className="flex flex-col justify-start space-y-2">
                                    <p className="text-[10px] text-slate-450 uppercase font-bold">Select Media Slide</p>
                                    
                                    <div className="flex flex-wrap gap-2">
                                      {vImages.map((img, idx) => (
                                        <button
                                          key={img + idx}
                                          onClick={() => {
                                            setActiveVariantImage(prev => ({ ...prev, [variant.id]: img }))
                                            setIsPlayingVariantVideo(prev => ({ ...prev, [variant.id]: false }))
                                          }}
                                          className={`w-16 h-12 rounded-lg overflow-hidden border shrink-0 transition-all ${
                                            currentActiveVImage === img && !isPlayingVVideo
                                              ? 'border-slate-900 bg-slate-100 scale-95'
                                              : 'border-slate-200 bg-slate-50 opacity-70 hover:opacity-100'
                                          }`}
                                        >
                                          <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                      ))}
                                      
                                      {hasVideo && (
                                        <button
                                          onClick={() => setIsPlayingVariantVideo(prev => ({ ...prev, [variant.id]: true }))}
                                          className={`w-16 h-12 rounded-lg overflow-hidden border shrink-0 transition-all flex flex-col items-center justify-center gap-0.5 bg-slate-900 text-white ${
                                            isPlayingVVideo ? 'border-slate-900 scale-95 bg-slate-800' : 'opacity-85 hover:opacity-100'
                                          }`}
                                        >
                                          <Play size={14} className="fill-white" />
                                          <span className="text-[8px] font-bold uppercase">Video</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setSelectedModel(null)}
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
