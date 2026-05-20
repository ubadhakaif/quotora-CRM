'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, MapPin, Building2, Search } from 'lucide-react'

interface Branch {
  id: string
  name: string
  address: string | null
  is_hq: boolean
  is_active: boolean
  created_at: string
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [search, setSearch] = useState('')
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchBranches = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      addToast(error.message, 'error')
    } else {
      setBranches(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAddPanel = () => {
    setEditingBranch(null)
    setFormName('')
    setFormAddress('')
    setPanelOpen(true)
  }

  const openEditPanel = (branch: Branch) => {
    setEditingBranch(branch)
    setFormName(branch.name)
    setFormAddress(branch.address || '')
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingBranch(null)
    setFormName('')
    setFormAddress('')
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)

    if (editingBranch) {
      const { error } = await supabase
        .from('branches')
        .update({ name: formName, address: formAddress })
        .eq('id', editingBranch.id)

      if (error) {
        addToast(error.message, 'error')
      } else {
        addToast('Branch updated', 'success')
        closePanel()
        fetchBranches()
      }
    } else {
      const { error } = await supabase
        .from('branches')
        .insert({
          tenant_id: profile?.tenant_id,
          name: formName,
          address: formAddress,
          is_hq: false,
        })

      if (error) {
        addToast(error.message, 'error')
      } else {
        addToast('Branch created', 'success')
        closePanel()
        fetchBranches()
      }
    }
    setSaving(false)
  }

  const filteredBranches = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.address || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="branch-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search branches..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>

        {/* Add/Close Button */}
        <button
          onClick={panelOpen ? closePanel : openAddPanel}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto"
        >
          {panelOpen ? <X size={18} /> : <Plus size={18} />}
          {panelOpen ? 'Close panel' : 'Add branch'}
        </button>
      </div>

      {/* Inline Panel */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-8 md:p-10 space-y-5">
          <h3 className="text-lg text-slate-900 pl-2">
            {editingBranch ? 'Edit branch' : 'New branch'}
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="branch-form-name" className="text-sm text-slate-600 pl-4">
                Branch name
              </label>
              <div className="relative">
                <Building2 size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="branch-form-name"
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. South City Showroom"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="branch-form-address" className="text-sm text-slate-600 pl-4">
                Address
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-5 top-4 text-slate-400" />
                <textarea
                  id="branch-form-address"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  placeholder="Full address"
                  rows={3}
                  className="w-full rounded-[1.5rem] py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none resize-none"
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
              {saving ? 'Saving...' : editingBranch ? 'Update branch' : 'Create branch'}
            </button>
          </div>
        </div>
      )}

      {/* Branches List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-20 rounded-[3rem]" />
          ))}
        </div>
      ) : filteredBranches.length === 0 ? (
        <div />
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3.5rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredBranches.map(branch => (
              <button
                key={branch.id}
                onClick={() => openEditPanel(branch)}
                className="w-full text-left p-4 md:p-8 px-6 md:px-12 hover:bg-slate-50 transition-colors flex items-center gap-4"
              >
                <MapPin size={18} className="text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 truncate">{branch.name}</p>
                  {branch.address && (
                    <p className="text-sm text-slate-500 truncate mt-0.5">{branch.address}</p>
                  )}
                </div>
                {branch.is_hq && (
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1 shrink-0">
                    HQ
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
