'use client'

import React, { useState, useEffect } from 'react'
import { calculateOnRoadPrice, requiresManagerApproval, formatINR } from '@/lib/pricing'
import { Plus, X, ArrowRight, DollarSign, Percent, ShieldAlert } from 'lucide-react'

interface Model {
  id: string
  name: string
}

interface Variant {
  id: string
  name: string
  price: number
  model_id: string
}

interface Accessory {
  id: string
  name: string
  price: number
}

interface Customer {
  id: string
  name: string
  phone: string | null
}

interface QuotationBuilderProps {
  customers: Customer[]
  models: Model[]
  variants: Variant[]
  accessories: Accessory[]
  discountThresholdLimit?: number
  onSave: (payload: {
    customerId: string
    variantId: string
    accessoryIds: string[]
    discountAmount: number
    discountPercent: number
    notes: string
    finalPrice: number
    requiresApproval: boolean
  }) => Promise<void>
  saving?: boolean
}

export function QuotationBuilder({
  customers,
  models,
  variants,
  accessories,
  discountThresholdLimit = 5,
  onSave,
  saving = false,
}: QuotationBuilderProps) {
  const [step, setStep] = useState<number>(1)

  // Builder Form State
  const [customerId, setCustomerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [selectedAccIds, setSelectedAccIds] = useState<string[]>([])
  const [discountAmt, setDiscountAmt] = useState<number>(0)
  const [discountPct, setDiscountPct] = useState<number>(0)
  const [notes, setNotes] = useState('')

  const activeVariant = variants.find(v => v.id === variantId)
  const exShowroom = activeVariant ? Number(activeVariant.price) : 0
  
  const selectedAccessories = accessories.filter(a => selectedAccIds.includes(a.id))
  const accessoriesTotal = selectedAccessories.reduce((acc, a) => acc + Number(a.price), 0)

  const p = calculateOnRoadPrice(exShowroom, accessoriesTotal, discountAmt, discountPct)

  const handleAccessoryToggle = (id: string) => {
    setSelectedAccIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleDiscountPctChange = (pctVal: number) => {
    const val = Math.min(100, Math.max(0, pctVal))
    setDiscountPct(val)
    setDiscountAmt(Math.round((p.subtotal * val) / 100))
  }

  const handleDiscountAmtChange = (amtVal: number) => {
    const val = Math.min(p.subtotal, Math.max(0, amtVal))
    setDiscountAmt(val)
    setDiscountPct(p.subtotal > 0 ? parseFloat(((val / p.subtotal) * 100).toFixed(2)) : 0)
  }

  const handleNextStep = () => {
    if (step === 1 && !customerId) return
    if (step === 2 && !variantId) return
    setStep(prev => Math.min(4, prev + 1))
  }

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1))
  }

  const handleFinalize = async () => {
    if (!customerId || !variantId) return
    const needsApproval = requiresManagerApproval(discountPct, discountThresholdLimit)
    await onSave({
      customerId,
      variantId,
      accessoryIds: selectedAccIds,
      discountAmount: discountAmt,
      discountPercent: discountPct,
      notes: notes.trim(),
      finalPrice: p.finalOnRoad,
      requiresApproval: needsApproval
    })
  }

  const filteredVariants = variants.filter(v => v.model_id === modelId)

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8 space-y-6">
      
      {/* Visual Step Indicator Progress */}
      <div className="grid grid-cols-4 gap-2 border-b border-slate-100 pb-5">
        {[1, 2, 3, 4].map(s => {
          const stepNames = ['Customer', 'Vehicle', 'Accessories', 'Discounts']
          const isDone = step > s
          const isActive = step === s
          return (
            <div key={s} className="space-y-2">
              <div className={`h-1.5 rounded-full transition-all ${isDone ? 'bg-emerald-500' : isActive ? 'bg-slate-900' : 'bg-slate-100'}`} />
              <p className={`text-[10px] md:text-xs font-medium text-center ${isActive ? 'text-slate-950 font-semibold' : 'text-slate-400'}`}>
                {stepNames[s - 1]}
              </p>
            </div>
          )
        })}
      </div>

      <div className="min-h-[180px]">
        {/* Step 1: Customer */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base text-slate-900 font-semibold pl-2">Step 1: Choose Assigned Customer</h4>
              <p className="text-xs text-slate-500 pl-2 mt-1">Attach this quote draft to a valid CRM contact profile.</p>
            </div>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white outline-none appearance-none text-sm"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 2: Vehicle */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base text-slate-900 font-semibold pl-2">Step 2: Choose Model & Variant</h4>
              <p className="text-xs text-slate-500 pl-2 mt-1">Select vehicle make and specification to retrieve pricing catalog.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select
                value={modelId}
                onChange={e => {
                  setModelId(e.target.value)
                  setVariantId('')
                }}
                className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white outline-none appearance-none text-sm"
              >
                <option value="">-- Choose Model --</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>

              <select
                value={variantId}
                onChange={e => setVariantId(e.target.value)}
                disabled={!modelId}
                className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white outline-none appearance-none text-sm disabled:opacity-50"
              >
                <option value="">-- Select Variant --</option>
                {filteredVariants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({formatINR(v.price)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Accessories */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-base text-slate-900 font-semibold pl-2">Step 3: Optional Vehicle Accessories</h4>
              <p className="text-xs text-slate-500 pl-2 mt-1">Configure additional values, trim extensions, or visual accessories.</p>
            </div>
            
            {accessories.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No accessories configuration available.</p>
            ) : (
              <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {accessories.map(acc => {
                  const isChecked = selectedAccIds.includes(acc.id)
                  return (
                    <label key={acc.id} className="flex items-center gap-3 cursor-pointer group select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleAccessoryToggle(acc.id)}
                        className="w-5 h-5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 transition-all cursor-pointer"
                      />
                      <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors">
                        {acc.name} ({formatINR(acc.price)})
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Discounts */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h4 className="text-base text-slate-900 font-semibold pl-2">Step 4: Discount & Subtotal Adjustments</h4>
              <p className="text-xs text-slate-500 pl-2 mt-1">Specify dealer-authorized discounts and finalize on-road quotes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Detailed Breakdown Panel */}
              <div className="lg:col-span-7 bg-slate-50 rounded-[2rem] border border-slate-200 p-5 space-y-3 text-xs text-slate-600">
                <h5 className="font-semibold text-slate-900 mb-1">Detailed Breakdown Summary</h5>
                <div className="flex justify-between pl-1">
                  <span>Ex-Showroom price</span>
                  <span className="font-medium text-slate-950">{formatINR(p.exShowroom)}</span>
                </div>
                <div className="flex justify-between pl-1 text-[10px] text-slate-400">
                  <span>GST Statutory Tax (28%)</span>
                  <span>+ {formatINR(p.gst)}</span>
                </div>
                <div className="flex justify-between pl-1 text-[10px] text-slate-400">
                  <span>RTO registration (10%)</span>
                  <span>+ {formatINR(p.rto)}</span>
                </div>
                <div className="flex justify-between pl-1 text-[10px] text-slate-400">
                  <span>Insurance premiums (3%)</span>
                  <span>+ {formatINR(p.insurance)}</span>
                </div>
                {p.tcs > 0 && (
                  <div className="flex justify-between pl-1 text-[10px] text-slate-400">
                    <span>Tax Collected at Source (TCS 1%)</span>
                    <span>+ {formatINR(p.tcs)}</span>
                  </div>
                )}
                <div className="flex justify-between pl-1">
                  <span>Accessories addition</span>
                  <span className="font-medium text-slate-950">+ {formatINR(p.accessoriesTotal)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2.5 flex justify-between font-bold text-slate-950 text-sm">
                  <span>Subtotal On-Road Price</span>
                  <span>{formatINR(p.subtotal)}</span>
                </div>
              </div>

              {/* Discount inputs */}
              <div className="lg:col-span-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 pl-3">Rate (%)</label>
                    <div className="relative">
                      <Percent size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        step={0.1}
                        value={discountPct || ''}
                        onChange={e => handleDiscountPctChange(Number(e.target.value))}
                        placeholder="e.g. 2.5"
                        className="w-full rounded-full py-2.5 pl-10 pr-4 bg-slate-50 border border-slate-200 text-xs focus:border-slate-900 outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 pl-3">Value (INR)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        value={discountAmt || ''}
                        onChange={e => handleDiscountAmtChange(Number(e.target.value))}
                        placeholder="e.g. 20000"
                        className="w-full rounded-full py-2.5 pl-10 pr-4 bg-slate-50 border border-slate-200 text-xs focus:border-slate-900 outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {discountPct > discountThresholdLimit && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-[10px] text-amber-800 leading-relaxed">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      Discount rate of <strong>{discountPct}%</strong> exceeds the standard threshold of {discountThresholdLimit}%. 
                      Requires Branch Manager approval.
                    </div>
                  </div>
                )}

                <div className="bg-slate-950 text-white rounded-2xl p-4 text-center">
                  <span className="text-[10px] text-slate-400">Total payable offer</span>
                  <p className="text-xl font-bold mt-0.5 text-white">{formatINR(p.finalOnRoad)}</p>
                </div>
              </div>

            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 pl-3">Add Custom Quotation Notes / Comments (Optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Mention validity periods, special dealership terms or corporate approvals..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-4 text-xs text-slate-900 focus:border-slate-900 focus:bg-white outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Button Controls */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-5">
        <button
          onClick={handlePrevStep}
          disabled={step === 1}
          className="bg-white border border-slate-200 text-slate-600 rounded-full py-3 px-6 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={handleNextStep}
            disabled={(step === 1 && !customerId) || (step === 2 && !variantId)}
            className="bg-slate-900 text-white rounded-full py-3 px-8 text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-55"
          >
            Continue
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleFinalize}
            disabled={saving}
            className="bg-slate-900 text-white rounded-full py-3 px-8 text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            {saving ? 'Creating quote...' : discountPct > discountThresholdLimit ? 'Submit for Approval' : 'Create Quotation'}
          </button>
        )}
      </div>

    </div>
  )
}
