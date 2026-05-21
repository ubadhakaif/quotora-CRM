import React from 'react'
import { calculateOnRoadPrice, formatINR } from '@/lib/pricing'
import { Landmark, Shield, HelpCircle, FileText, CheckCircle2 } from 'lucide-react'

interface PriceBreakdownProps {
  exShowroomPrice: number
  accessoriesPrice?: number
  discountAmount?: number
  discountPercent?: number
  className?: string
}

export function PriceBreakdown({
  exShowroomPrice,
  accessoriesPrice = 0,
  discountAmount = 0,
  discountPercent = 0,
  className = '',
}: PriceBreakdownProps) {
  const p = calculateOnRoadPrice(exShowroomPrice, accessoriesPrice, discountAmount, discountPercent)

  return (
    <div className={`bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8 space-y-6 ${className}`}>
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100 shadow-sm">
          <FileText size={18} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Dealership pricing breakdown</h4>
          <p className="text-[11px] text-slate-500">Statutory taxes and charges calculated dynamically</p>
        </div>
      </div>

      <div className="space-y-3.5 text-sm text-slate-600">
        <div className="flex justify-between items-center pl-2">
          <span>Ex-Showroom Base Value</span>
          <span className="font-medium text-slate-900">{formatINR(p.exShowroom)}</span>
        </div>

        <div className="flex justify-between items-center pl-2 text-xs text-slate-500 bg-slate-50/50 py-1.5 px-3 rounded-lg border border-slate-100/50">
          <span className="flex items-center gap-1.5">
            <Landmark size={13} className="text-slate-400" />
            Statutory Goods & Service Tax (GST 28%)
          </span>
          <span>+ {formatINR(p.gst)}</span>
        </div>

        <div className="flex justify-between items-center pl-2 text-xs text-slate-500 bg-slate-50/50 py-1.5 px-3 rounded-lg border border-slate-100/50">
          <span className="flex items-center gap-1.5">
            <Landmark size={13} className="text-slate-400" />
            RTO Road Tax Registration (10%)
          </span>
          <span>+ {formatINR(p.rto)}</span>
        </div>

        <div className="flex justify-between items-center pl-2 text-xs text-slate-500 bg-slate-50/50 py-1.5 px-3 rounded-lg border border-slate-100/50">
          <span className="flex items-center gap-1.5">
            <Shield size={13} className="text-slate-400" />
            Comprehensive Vehicle Insurance (3%)
          </span>
          <span>+ {formatINR(p.insurance)}</span>
        </div>

        {p.tcs > 0 && (
          <div className="flex justify-between items-center pl-2 text-xs text-slate-500 bg-slate-50/50 py-1.5 px-3 rounded-lg border border-slate-100/50">
            <span className="flex items-center gap-1.5">
              <Landmark size={13} className="text-slate-400" />
              Tax Collected at Source (TCS 1%)
            </span>
            <span>+ {formatINR(p.tcs)}</span>
          </div>
        )}

        <div className="flex justify-between items-center pl-2">
          <span>Accessories Added</span>
          <span className="font-medium text-slate-900">+ {formatINR(p.accessoriesTotal)}</span>
        </div>

        <div className="border-t border-slate-200 pt-3 flex justify-between items-center pl-2 font-semibold text-slate-800">
          <span>On-Road Subtotal</span>
          <span>{formatINR(p.subtotal)}</span>
        </div>

        {p.discountAmount > 0 && (
          <div className="flex justify-between items-center pl-2 text-emerald-600 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={15} className="text-emerald-500" />
              Dealership Discount Applied ({p.discountPercent}%)
            </span>
            <span className="font-bold">- {formatINR(p.discountAmount)}</span>
          </div>
        )}
      </div>

      <div className="bg-slate-900 text-white rounded-[1.5rem] p-5 flex items-center justify-between shadow-inner">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Final Quotation Offer</span>
          <h3 className="text-2xl font-bold text-white tracking-tight mt-0.5">{formatINR(p.finalOnRoad)}</h3>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-3 py-1 rounded-full border border-slate-700">
          Valid for 15 Days
        </span>
      </div>
    </div>
  )
}
