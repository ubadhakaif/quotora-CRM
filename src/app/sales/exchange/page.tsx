'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, Search, RefreshCw, Car, DollarSign, Calendar, Compass, Paperclip } from 'lucide-react'

interface Customer {
  name: string
  phone: string | null
}

interface Quotation {
  id: string
  total_price: number
  status: string
  created_at: string
  customer_id: string
  customers?: Customer | null
}

interface ExchangeVehicle {
  id: string
  quotation_id: string
  make: string
  model: string
  year: number | null
  kms_driven: number | null
  condition: string
  estimated_value: number
  notes: string | null
  created_at: string
  quotations?: Quotation | null
}

const conditionColors: Record<string, string> = {
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  good: 'bg-blue-50 text-blue-700 border-blue-200',
  fair: 'bg-amber-50 text-amber-700 border-amber-200',
  poor: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function SalesExchangePage() {
  const [exchangeList, setExchangeList] = useState<ExchangeVehicle[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Add Exchange Form State
  const [fQuotationId, setFQuotationId] = useState('')
  const [fMake, setFMake] = useState('')
  const [fModel, setFModel] = useState('')
  const [fYear, setFYear] = useState('')
  const [fKms, setFKms] = useState('')
  const [fCondition, setFCondition] = useState('good')
  const [fValue, setFValue] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchData = async () => {
    if (!profile?.id) return
    setLoading(true)

    // Fetch exchange vehicles associated with employee's own quotations, and active own quotations
    const [exchangeRes, quotesRes] = await Promise.all([
      supabase
        .from('exchange_vehicles')
        .select('*, quotations(*, customers(name, phone))')
        .order('created_at', { ascending: false }),
      supabase
        .from('quotations')
        .select('*, customers(name, phone)')
        .eq('created_by', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    ])

    if (exchangeRes.data) setExchangeList(exchangeRes.data as any[])
    if (quotesRes.data) setQuotations(quotesRes.data as any[])
    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchData()
    }
  }, [profile])

  const handleOpenAdd = () => {
    setFQuotationId('')
    setFMake('')
    setFModel('')
    setFYear('')
    setFKms('')
    setFCondition('good')
    setFValue('')
    setFNotes('')
    setPanelOpen(true)
  }

  const handleCloseAdd = () => {
    setPanelOpen(false)
  }

  const handleAddExchange = async () => {
    if (!fQuotationId || !fMake.trim() || !fModel.trim() || !fValue || !profile) return
    setSaving(true)

    const newExchange = {
      tenant_id: profile.tenant_id,
      quotation_id: fQuotationId,
      make: fMake.trim(),
      model: fModel.trim(),
      year: fYear ? Number(fYear) : null,
      kms_driven: fKms ? Number(fKms) : null,
      condition: fCondition,
      estimated_value: Number(fValue) || 0,
      notes: fNotes.trim() || null,
    }

    const { error } = await supabase.from('exchange_vehicles').insert(newExchange)

    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast('Exchange vehicle details attached to quotation successfully', 'success')
      
      // Proactively create CRM note for customer about exchange estimation
      const selectedQuote = quotations.find(q => q.id === fQuotationId)
      if (selectedQuote && selectedQuote.customers) {
        await supabase.from('customer_notes').insert({
          tenant_id: profile.tenant_id,
          customer_id: selectedQuote.customer_id,
          created_by: profile.id,
          content: `Trade-in exchange vehicle added: ${fMake} ${fModel} (${fYear || 'N/A'}). Estimated Valuation: ₹${Number(fValue).toLocaleString('en-IN')}`,
          note_type: 'general'
        })
      }

      handleCloseAdd()
      fetchData()
    }
    setSaving(false)
  }

  const fmtINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  const filtered = exchangeList.filter(e => {
    const custName = e.quotations?.customers?.name || ''
    const matchSearch = 
      custName.toLowerCase().includes(search.toLowerCase()) ||
      e.make.toLowerCase().includes(search.toLowerCase()) ||
      e.model.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exchanges by customer, car make or model..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <button
          onClick={panelOpen ? handleCloseAdd : handleOpenAdd}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto shrink-0"
        >
          {panelOpen ? <X size={18} /> : <Plus size={18} />}
          {panelOpen ? 'Close panel' : 'Add trade-in vehicle'}
        </button>
      </div>

      {/* Add Trade-in Panel */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 space-y-6">
          <div>
            <h3 className="text-lg text-slate-900 pl-2">Add Exchange Vehicle Details</h3>
            <p className="text-sm text-slate-500 pl-2 mt-1">Associate and evaluate a customer trade-in vehicle for a quotation offer.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Quote */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Attach to Quotation Offer</label>
                <select
                  value={fQuotationId}
                  onChange={e => setFQuotationId(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="">-- Select Active Draft Quote --</option>
                  {quotations.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.customers?.name || 'Unspecified'} - ₹{fmtINR(q.total_price)} ({new Date(q.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimated value */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Manual Valuation Estimate (INR)</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={fValue}
                    onChange={e => setFValue(e.target.value)}
                    placeholder="e.g. 350000"
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Make */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Manufacturer / Make</label>
                <div className="relative">
                  <Compass size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fMake}
                    onChange={e => setFMake(e.target.value)}
                    placeholder="Maruti Suzuki, Honda, Hyundai"
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Model */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Vehicle Model</label>
                <div className="relative">
                  <Car size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fModel}
                    onChange={e => setFModel(e.target.value)}
                    placeholder="Swift, City, i20"
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Year */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Manufacturing Year</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={fYear}
                    onChange={e => setFYear(e.target.value)}
                    placeholder="e.g. 2018"
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* KMs */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Kilometers Driven (KMs)</label>
                <div className="relative">
                  <RefreshCw size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={fKms}
                    onChange={e => setFKms(e.target.value)}
                    placeholder="e.g. 64000"
                    className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">General Condition Category</label>
                <select
                  value={fCondition}
                  onChange={e => setFCondition(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="excellent">Excellent (showroom clean)</option>
                  <option value="good">Good (regular minor wear)</option>
                  <option value="fair">Fair (dents/scratches, running)</option>
                  <option value="poor">Poor (needs major repair)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Evaluation Appraisal Notes</label>
              <textarea
                value={fNotes}
                onChange={e => setFNotes(e.target.value)}
                placeholder="Mention ownership status, insurance details, tire condition or structural remarks..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCloseAdd}
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              onClick={handleAddExchange}
              disabled={!fQuotationId || !fMake.trim() || !fModel.trim() || !fValue || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Saving...' : 'Add Trade-in'}
            </button>
          </div>
        </div>
      )}

      {/* Exchange List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-[2.5rem]" />)}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(e => (
              <div key={e.id} className="p-6 md:p-8 px-6 md:px-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50 transition-all">
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Car size={22} />
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-slate-900 font-medium text-lg truncate">
                        {e.make} {e.model} {e.year ? `(${e.year})` : ''}
                      </h4>
                      <span className={`text-[10px] uppercase tracking-wider font-bold rounded-full px-2.5 py-0.5 border ${conditionColors[e.condition] || ''}`}>
                        {e.condition}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                      {e.kms_driven && <span>🏁 {e.kms_driven.toLocaleString()} KMs driven</span>}
                      {e.quotations?.customers?.name && (
                        <span className="flex items-center gap-1">
                          👤 Customer: <span className="font-semibold text-slate-700">{e.quotations.customers.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col md:flex-row items-stretch md:items-center gap-6 lg:border-l lg:border-slate-100 lg:pl-8">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 md:text-right">Valuation Estimate</p>
                    <p className="text-xl font-bold text-slate-900 md:text-right">{fmtINR(e.estimated_value)}</p>
                  </div>
                  
                  {e.notes && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 max-w-[200px] text-[11px] text-slate-500 leading-relaxed truncate" title={e.notes}>
                      📝 {e.notes}
                    </div>
                  )}
                </div>

              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-16 text-center text-slate-500">No trade-in vehicles found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
