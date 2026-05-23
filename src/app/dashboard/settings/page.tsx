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
  { id: 'operations', label: 'Operations' },
]

// 12h / 24h Format Helpers
const parse24To12 = (timeStr: string) => {
  const [hStr, mStr] = (timeStr || '09:00').split(':')
  const h24 = Number(hStr)
  const m = Number(mStr)
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  return { hour: h12, minute: m, period }
}

const format12To24 = (hour: number, minute: number, period: string) => {
  let h24 = hour
  if (period === 'PM' && hour !== 12) h24 += 12
  if (period === 'AM' && hour === 12) h24 = 0
  const hStr = String(h24).padStart(2, '0')
  const mStr = String(minute).padStart(2, '0')
  return `${hStr}:${mStr}`
}

interface TimePicker12Props {
  label: string
  value: string
  onChange: (val: string) => void
}

const TimePicker12 = ({ label, value, onChange }: TimePicker12Props) => {
  const { hour, minute, period } = parse24To12(value)

  const handleValChange = (newHour: number, newMin: number, newPeriod: string) => {
    onChange(format12To24(newHour, newMin, newPeriod))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 pl-4">{label}</label>
      <div className="flex items-center gap-2">
        {/* Hour Select */}
        <div className="relative flex-1">
          <select
            value={hour}
            onChange={e => handleValChange(Number(e.target.value), minute, period)}
            className="w-full rounded-full py-4 px-4 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none cursor-pointer appearance-none text-center font-medium"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
        
        <span className="text-slate-400 font-bold shrink-0">:</span>

        {/* Minute Select */}
        <div className="relative flex-1">
          <select
            value={minute}
            onChange={e => handleValChange(hour, Number(e.target.value), period)}
            className="w-full rounded-full py-4 px-4 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none cursor-pointer appearance-none text-center font-medium"
          >
            {Array.from({ length: 60 }, (_, i) => i).map(m => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>

        {/* AM/PM Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shrink-0">
          {['AM', 'PM'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => handleValChange(hour, minute, p)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                period === p 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

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
    <div className="space-y-8">
      {/* Quick Tiles Grid — heading only */}
      {/* Standard Underline Tabs */}
      <div className="border-b border-slate-200 w-full">
        <nav className="flex -mb-px space-x-6 sm:space-x-8 overflow-x-auto scrollbar-none" aria-label="Tabs">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  border-b-2 py-4 px-1 text-sm font-medium transition-all cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1 sm:flex-initial text-center sm:text-left
                  ${isActive
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }
                `}
                title={tab.label}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-12 space-y-8">
        {activeTab === 'branding' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" /> Branding
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 pl-4">Dealership Name</label>
                <input
                  type="text"
                  value={settings['branding.name'] || ''}
                  onChange={e => handleSettingChange('branding.name', e.target.value)}
                  placeholder="E.g. Auto World Motors"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 pl-4">Tagline</label>
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
                <label className="text-sm font-semibold text-slate-700 pl-4">CGST (%)</label>
                <input
                  type="number"
                  value={settings['tax.cgst_percent'] !== undefined ? settings['tax.cgst_percent'] : ''}
                  onChange={e => handleSettingChange('tax.cgst_percent', Number(e.target.value))}
                  placeholder="14"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 pl-4">SGST (%)</label>
                <input
                  type="number"
                  value={settings['tax.sgst_percent'] !== undefined ? settings['tax.sgst_percent'] : ''}
                  onChange={e => handleSettingChange('tax.sgst_percent', Number(e.target.value))}
                  placeholder="14"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 pl-4">TCS Threshold (₹)</label>
                <input
                  type="number"
                  value={settings['tax.tcs_threshold'] !== undefined ? settings['tax.tcs_threshold'] : ''}
                  onChange={e => handleSettingChange('tax.tcs_threshold', Number(e.target.value))}
                  placeholder="1000000"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 pl-4">TCS (%)</label>
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
                <label className="text-sm font-semibold text-slate-700 pl-4">Road Tax & State Charges (%)</label>
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
                <label className="text-sm font-semibold text-slate-700 pl-4">RTO & Registration Fees (₹)</label>
                <input
                  type="number"
                  value={settings['tax.rto_fee_percent'] !== undefined ? settings['tax.rto_fee_percent'] : ''}
                  onChange={e => handleSettingChange('tax.rto_fee_percent', Number(e.target.value))}
                  placeholder="5000"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              <div className="space-y-2 col-span-1 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700 pl-4">Comprehensive Vehicle Insurance (%)</label>
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
                <label className="text-sm font-semibold text-slate-700 pl-4">Max Auto-Approved Discount (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={settings['quotation.max_auto_discount_percent'] || ''}
                  onChange={e => handleSettingChange('quotation.max_auto_discount_percent', Number(e.target.value))}
                  placeholder="E.g. 2.5"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
                <p className="text-xs text-slate-500 pl-4 font-semibold mt-1">Discounts above this percentage will require branch manager approval.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 pl-4">Max Auto-Approved Discount (Amount ₹)</label>
                <input
                  type="number"
                  value={settings['quotation.max_auto_discount_amount'] || ''}
                  onChange={e => handleSettingChange('quotation.max_auto_discount_amount', Number(e.target.value))}
                  placeholder="E.g. 10000"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
                <p className="text-xs text-slate-500 pl-4 font-semibold mt-1">Discounts above this flat amount will require branch manager approval.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" /> Operations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* 12-Hour format Toggle Switch */}
              <div className="space-y-4 border-b border-slate-100 pb-6 col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">12-Hour Time Format</h4>
                    <p className="text-xs text-slate-500 mt-1">Enable 12-hour AM/PM selectors for setting operational shifts.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('operations.use_12hour', !settings['operations.use_12hour'])}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings['operations.use_12hour'] ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        settings['operations.use_12hour'] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Shift Start and Shift End input fields based on 12-hour format setting */}
              {settings['operations.use_12hour'] ? (
                <>
                  <TimePicker12
                    label="Shift Start Time"
                    value={settings['operations.shift_start'] || '09:00'}
                    onChange={val => handleSettingChange('operations.shift_start', val)}
                  />
                  <TimePicker12
                    label="Shift End Time"
                    value={settings['operations.shift_end'] || '18:00'}
                    onChange={val => handleSettingChange('operations.shift_end', val)}
                  />
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 pl-4">Shift Start Time (IST)</label>
                    <input
                      type="time"
                      value={settings['operations.shift_start'] || '09:00'}
                      onChange={e => handleSettingChange('operations.shift_start', e.target.value)}
                      className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 pl-4">Shift End Time (IST)</label>
                    <input
                      type="time"
                      value={settings['operations.shift_end'] || '18:00'}
                      onChange={e => handleSettingChange('operations.shift_end', e.target.value)}
                      className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700 pl-4">Roster Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={settings['operations.grace_period'] !== undefined ? settings['operations.grace_period'] : '15'}
                  onChange={e => handleSettingChange('operations.grace_period', Number(e.target.value))}
                  placeholder="15"
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
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
