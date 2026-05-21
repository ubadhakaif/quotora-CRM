import React, { useState } from 'react'
import { Calendar } from 'lucide-react'

export interface DateRange {
  startDate: string
  endDate: string
  preset: string
}

interface DateRangeFilterProps {
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangeFilter({ onChange, className = '' }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<string>('month')
  
  const getPresetDates = (type: string) => {
    const today = new Date()
    let start = new Date()
    let end = new Date()

    switch (type) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        const dayOfWeek = today.getDay()
        start.setDate(today.getDate() - dayOfWeek)
        start.setHours(0, 0, 0, 0)
        break
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'last30':
        start.setDate(today.getDate() - 30)
        break
      case 'year':
        start = new Date(today.getFullYear(), 0, 1)
        break
      default:
        break
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }
  }

  const [customStart, setCustomStart] = useState<string>(getPresetDates('month').startDate)
  const [customEnd, setCustomEnd] = useState<string>(getPresetDates('month').endDate)

  const handlePresetChange = (p: string) => {
    setPreset(p)
    if (p !== 'custom') {
      const dates = getPresetDates(p)
      onChange({ startDate: dates.startDate, endDate: dates.endDate, preset: p })
    } else {
      onChange({ startDate: customStart, endDate: customEnd, preset: p })
    }
  }

  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStart(start)
    setCustomEnd(end)
    onChange({ startDate: start, endDate: end, preset: 'custom' })
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-[2rem] p-5 flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-100">
          <Calendar size={18} />
        </div>
        <div>
          <span className="text-xs text-slate-400">Date Range Filter</span>
          <p className="text-sm font-semibold text-slate-800">Select reporting period</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['today', 'week', 'month', 'last30', 'year', 'custom'].map(pOption => {
          const isActive = preset === pOption
          const labels: Record<string, string> = {
            today: 'Today',
            week: 'This Week',
            month: 'This Month',
            last30: 'Last 30 Days',
            year: 'This Year',
            custom: 'Custom Range'
          }
          return (
            <button
              key={pOption}
              onClick={() => handlePresetChange(pOption)}
              className={`rounded-full px-4 py-2 text-xs font-semibold border transition-all ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              {labels[pOption]}
            </button>
          )
        })}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <input
            type="date"
            value={customStart}
            onChange={e => handleCustomDateChange(e.target.value, customEnd)}
            className="rounded-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:border-slate-900 outline-none"
          />
          <span className="text-slate-400 text-xs font-medium">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => handleCustomDateChange(customStart, e.target.value)}
            className="rounded-full px-4 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:border-slate-900 outline-none"
          />
        </div>
      )}
    </div>
  )
}
