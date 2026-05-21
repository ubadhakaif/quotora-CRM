import React from 'react'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-12 md:p-16 flex flex-col items-center text-center max-w-xl mx-auto space-y-6">
      <div className="bg-slate-50 w-16 h-16 rounded-[1.5rem] flex items-center justify-center border border-slate-100 shadow-sm">
        <Icon size={28} className="text-slate-400" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-medium text-slate-900 tracking-tight">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-slate-900 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
