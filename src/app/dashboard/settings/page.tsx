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
  { id: 'operations', label: 'Operations & Roster' },
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

  // Format time string (HH:MM) to IST display
  const formatTimeIST = (timeStr: string) => {
    if (!timeStr) return '--:--'
    const [h, m] = timeStr.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${String(m).padStart(2, '0')} ${period} IST`
  }

  if (loading) {
    return <div className="skeleton h-64 w-full rounded-[2rem]" />
  }

  return (
    <div className="space-y-8">
      {/* Quick Tiles Grid — heading only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`text-left px-6 py-5 rounded-[2rem] border transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <h4 className="font-bold text-sm leading-snug">{tab.label}</h4>
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 space-y-8">
        {activeTab === 'branding' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
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
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" /> Tax Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">CGST (%)</label>
                <input
                  type="number"
                  value={settings['tax.cgst_percent'] !== undefined ? settings['tax.cgst_percent'] : ''}
                  onChange={e => handleSettingChange('tax.cgst_percent', Number(e.target.value))}
                  placeholder="14"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">SGST (%)</label>
                <input
                  type="number"
                  value={settings['tax.sgst_percent'] !== undefined ? settings['tax.sgst_percent'] : ''}
                  onChange={e => handleSettingChange('tax.sgst_percent', Number(e.target.value))}
                  placeholder="14"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">TCS Threshold (₹)</label>
                <input
                  type="number"
                  value={settings['tax.tcs_threshold'] !== undefined ? settings['tax.tcs_threshold'] : ''}
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
                  value={settings['tax.tcs_percent'] !== undefined ? settings['tax.tcs_percent'] : ''}
                  onChange={e => handleSettingChange('tax.tcs_percent', Number(e.target.value))}
                  placeholder="1"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Road Tax & State Charges (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings['tax.road_tax_percent'] !== undefined ? settings['tax.road_tax_percent'] : ''}
                  onChange={e => handleSettingChange('tax.road_tax_percent', Number(e.target.value))}
                  placeholder="10"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">RTO & Registration Fees (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings['tax.rto_fee_percent'] !== undefined ? settings['tax.rto_fee_percent'] : ''}
                  onChange={e => handleSettingChange('tax.rto_fee_percent', Number(e.target.value))}
                  placeholder="2"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Comprehensive Vehicle Insurance (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings['tax.insurance_percent'] !== undefined ? settings['tax.insurance_percent'] : ''}
                  onChange={e => handleSettingChange('tax.insurance_percent', Number(e.target.value))}
                  placeholder="4"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quotation' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
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

        {activeTab === 'operations' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" /> Operations & Attendance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Shift Start Time</label>
                <input
                  type="time"
                  value={settings['operations.shift_start'] || '09:00'}
                  onChange={e => handleSettingChange('operations.shift_start', e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
                <p className="text-xs text-slate-500 pl-4">
                  {formatTimeIST(settings['operations.shift_start'] || '09:00')}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Shift End Time</label>
                <input
                  type="time"
                  value={settings['operations.shift_end'] || '18:00'}
                  onChange={e => handleSettingChange('operations.shift_end', e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
                <p className="text-xs text-slate-500 pl-4">
                  {formatTimeIST(settings['operations.shift_end'] || '18:00')}
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Roster Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={settings['operations.grace_period'] !== undefined ? settings['operations.grace_period'] : '15'}
                  onChange={e => handleSettingChange('operations.grace_period', Number(e.target.value))}
                  placeholder="15"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2 sm:col-span-2 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-4">Dealership Registration Time (First-Time Sign-In)</label>
                <div className="w-full rounded-full py-4 px-6 bg-slate-50/50 border border-slate-200 text-slate-800 font-semibold select-none">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                      }) + ' IST'
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center cursor-pointer font-semibold text-sm"
          >
            {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}
