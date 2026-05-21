import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmActionProps {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  className?: string
}

export function ConfirmAction({
  title = 'Are you absolutely sure?',
  message,
  confirmLabel = 'Yes, proceed',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  className = '',
}: ConfirmActionProps) {
  return (
    <div className={`bg-rose-50/50 border border-rose-100 rounded-[2rem] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${className}`}>
      <div className="flex items-start gap-4">
        <div className="bg-rose-100 text-rose-700 w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0">
          <AlertTriangle size={22} />
        </div>
        <div className="space-y-1">
          <h4 className="text-rose-900 font-semibold text-base">{title}</h4>
          <p className="text-rose-700/80 text-sm leading-relaxed">{message}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
        <button
          onClick={onCancel}
          disabled={loading}
          className="bg-white border border-rose-200 text-rose-800 rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-rose-100/50 transition-colors focus:outline-none disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="bg-rose-600 text-white rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-rose-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Confirming...' : confirmLabel}
        </button>
      </div>
    </div>
  )
}
