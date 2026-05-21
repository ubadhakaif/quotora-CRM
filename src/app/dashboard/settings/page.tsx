'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Settings, Save } from 'lucide-react'

const TABS = [
  { id: 'branding', label: 'Branding' },
  { id: 'tax', label: 'Tax Configuration' },
  { id: 'quotation', label: 'Quotation Rules' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('branding')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, any>>({})
  
  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dealership_settings')
      .select('key, value')

    if (error) {
      addToast(error.message, 'error')
    } else {
      const parsed: Record<string, any> = {}
      data.forEach((d: any) => { parsed[d.key] = d.value })
      setSettings(parsed)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const promises = Object.entries(settings).map(([key, value]) => {
        return supabase.from('dealership_settings').upsert(
          { tenant_id: profile?.tenant_id, key, value },
          { onConflict: 'tenant_id,key' }
        )
      })
      await Promise.all(promises)
      addToast('Settings saved successfully', 'success')
    } catch (err: any) {
      addToast(err.message || 'Error saving settings', 'error')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="skeleton h-64 w-full rounded-[2rem]" />
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-full px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 space-y-8">
        {activeTab === 'branding' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-medium text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" /> Branding
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Dealership Name</label>
                <input
                  type="text"
                  value={settings['branding.name'] || ''}
                  onChange={e => handleSettingChange('branding.name', e.target.value)}
                  placeholder="E.g. Auto World Motors"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tagline</label>
                <input
                  type="text"
                  value={settings['branding.tagline'] || ''}
                  onChange={e => handleSettingChange('branding.tagline', e.target.value)}
                  placeholder="E.g. Driving your dreams"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-medium text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" /> Tax Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">CGST (%)</label>
                <input
                  type="number"
                  value={settings['tax.cgst_percent'] || ''}
                  onChange={e => handleSettingChange('tax.cgst_percent', Number(e.target.value))}
                  placeholder="14"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">SGST (%)</label>
                <input
                  type="number"
                  value={settings['tax.sgst_percent'] || ''}
                  onChange={e => handleSettingChange('tax.sgst_percent', Number(e.target.value))}
                  placeholder="14"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">TCS Threshold (₹)</label>
                <input
                  type="number"
                  value={settings['tax.tcs_threshold'] || ''}
                  onChange={e => handleSettingChange('tax.tcs_threshold', Number(e.target.value))}
                  placeholder="1000000"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">TCS (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings['tax.tcs_percent'] || ''}
                  onChange={e => handleSettingChange('tax.tcs_percent', Number(e.target.value))}
                  placeholder="1"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quotation' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-medium text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" /> Quotation Rules
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Max Auto-Approved Discount (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings['quotation.max_auto_discount_percent'] || ''}
                  onChange={e => handleSettingChange('quotation.max_auto_discount_percent', Number(e.target.value))}
                  placeholder="E.g. 2.5"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
                <p className="text-xs text-slate-500 pl-4">Discounts above this percentage will require branch manager approval.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Max Auto-Approved Discount (Amount ₹)</label>
                <input
                  type="number"
                  value={settings['quotation.max_auto_discount_amount'] || ''}
                  onChange={e => handleSettingChange('quotation.max_auto_discount_amount', Number(e.target.value))}
                  placeholder="E.g. 10000"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
                <p className="text-xs text-slate-500 pl-4">Discounts above this flat amount will require branch manager approval.</p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}
