'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, Landmark, Search, FileText } from 'lucide-react'

interface FinancePlan {
  id: string
  name: string
  min_tenure_months: number
  max_tenure_months: number
  interest_rate: number
  processing_fee_percent: number
  min_down_payment_percent: number
  is_active: boolean
}

interface FinanceProvider {
  id: string
  name: string
  logo_url: string | null
  is_active: boolean
  finance_plans?: FinancePlan[]
}

export default function FinancePage() {
  const [providers, setProviders] = useState<FinanceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<FinanceProvider | null>(null)
  const [search, setSearch] = useState('')
  
  // Provider Form State
  const [formName, setFormName] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchProviders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('finance_providers')
      .select('*, finance_plans(*)')
      .order('name')

    if (error) {
      addToast(error.message, 'error')
    } else {
      setProviders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProviders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAddPanel = () => {
    setEditingProvider(null)
    setFormName('')
    setFormLogoUrl('')
    setPanelOpen(true)
  }

  const openEditPanel = (provider: FinanceProvider) => {
    setEditingProvider(provider)
    setFormName(provider.name)
    setFormLogoUrl(provider.logo_url || '')
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingProvider(null)
    setFormName('')
    setFormLogoUrl('')
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)

    if (editingProvider) {
      const { error } = await supabase
        .from('finance_providers')
        .update({ name: formName, logo_url: formLogoUrl })
        .eq('id', editingProvider.id)

      if (error) {
        addToast(error.message, 'error')
      } else {
        addToast('Provider updated', 'success')
        closePanel()
        fetchProviders()
      }
    } else {
      const { error } = await supabase
        .from('finance_providers')
        .insert({
          tenant_id: profile?.tenant_id,
          name: formName,
          logo_url: formLogoUrl,
          is_active: true,
        })

      if (error) {
        addToast(error.message, 'error')
      } else {
        addToast('Provider created', 'success')
        closePanel()
        fetchProviders()
      }
    }
    setSaving(false)
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('finance_providers')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    
    if (error) {
      addToast(error.message, 'error')
    } else {
      addToast(`Provider ${!currentStatus ? 'activated' : 'deactivated'}`, 'success')
      fetchProviders()
    }
  }

  const filteredProviders = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search providers..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>

        <button
          onClick={panelOpen && !editingProvider ? closePanel : openAddPanel}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto"
        >
          {panelOpen && !editingProvider ? <X size={18} /> : <Plus size={18} />}
          {panelOpen && !editingProvider ? 'Close panel' : 'Add provider'}
        </button>
      </div>

      {/* Edit/Add Panel */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">
            {editingProvider ? 'Edit Provider' : 'New Provider'}
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Provider name</label>
              <div className="relative">
                <Landmark size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Logo URL (Optional)</label>
              <div className="relative">
                <FileText size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formLogoUrl}
                  onChange={e => setFormLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={closePanel}
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 flex items-center justify-start gap-3 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formName.trim() || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Saving...' : editingProvider ? 'Update provider' : 'Create provider'}
            </button>
          </div>
        </div>
      )}

      {/* Providers List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-24 rounded-[2rem]" />
          ))}
        </div>
      ) : filteredProviders.length === 0 ? (
        <div />
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredProviders.map(provider => (
              <div
                key={provider.id}
                className={`p-4 md:p-8 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${!provider.is_active ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => openEditPanel(provider)} role="button">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border border-slate-200">
                    {provider.logo_url ? (
                      <img src={provider.logo_url} alt={provider.name} className="w-full h-full object-cover" />
                    ) : (
                      <Landmark size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-lg font-medium truncate ${!provider.is_active ? 'text-slate-500' : 'text-slate-900'}`}>{provider.name}</p>
                      {!provider.is_active && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 font-medium">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {provider.finance_plans?.length || 0} finance plan(s)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleToggleActive(provider.id, provider.is_active)}
                    className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 rounded-full px-4 py-2"
                  >
                    {provider.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEditPanel(provider)}
                    className="text-sm font-medium text-slate-900 hover:text-slate-700 transition-colors bg-slate-100 border border-slate-200 rounded-full px-4 py-2"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
