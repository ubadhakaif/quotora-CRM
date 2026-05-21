import React from 'react'

export type BadgeType = 'quotation' | 'lead' | 'approval' | 'general'

interface StatusBadgeProps {
  status: string
  type?: BadgeType
  className?: string
}

const config: Record<BadgeType, Record<string, string>> = {
  quotation: {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    sent: 'bg-blue-50 text-blue-700 border-blue-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  lead: {
    new: 'bg-sky-50 text-sky-700 border-sky-200',
    hot: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
    warm: 'bg-amber-50 text-amber-700 border-amber-200',
    cold: 'bg-slate-100 text-slate-600 border-slate-200',
    converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-slate-200 text-slate-500 border-slate-300',
  },
  approval: {
    none: 'bg-slate-50 text-slate-400 border-slate-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  general: {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
    missed: 'bg-rose-50 text-rose-700 border-rose-200',
  }
}

export function StatusBadge({ status, type = 'general', className = '' }: StatusBadgeProps) {
  const normStatus = status?.toLowerCase() || ''
  
  // Find styles or fall back to standard general styles
  const styles = config[type]?.[normStatus] || 'bg-slate-50 text-slate-600 border-slate-200'

  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border transition-all inline-flex items-center gap-1 ${styles} ${className}`}>
      {normStatus === 'hot' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />}
      {status}
    </span>
  )
}
