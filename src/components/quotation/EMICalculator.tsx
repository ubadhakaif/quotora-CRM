'use client'

import React, { useState, useEffect } from 'react'
import { calculateEMI, isDownPaymentSufficient } from '@/lib/emi'
import { formatINR } from '@/lib/pricing'
import { createClient } from '@/lib/supabase/client'
import { Calculator, ShieldCheck, Landmark } from 'lucide-react'

interface FinanceProvider {
  id: string
  name: string
}

interface FinancePlan {
  id: string
  provider_id: string
  name: string
  min_tenure_months: number
  max_tenure_months: number
  interest_rate: number
  processing_fee_percent: number
  min_down_payment_percent: number
  finance_providers?: FinanceProvider | null
}

interface EMICalculatorProps {
  initialVehiclePrice?: number
  tenantId?: string
  className?: string
}

export function EMICalculator({
  initialVehiclePrice = 1000000,
  tenantId,
  className = '',
}: EMICalculatorProps) {
  const [plans, setPlans] = useState<FinancePlan[]>([])
  const [loading, setLoading] = useState(true)

  // Calculator inputs
  const [vehiclePrice, setVehiclePrice] = useState<number>(initialVehiclePrice)
  const [downPayment, setDownPayment] = useState<number>(Math.round(initialVehiclePrice * 0.2))
  const [tenure, setTenure] = useState<number>(60)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    async function fetchPlans() {
      setLoading(true)
      let query = supabase.from('finance_plans').select('*, finance_providers(id, name)').eq('is_active', true)
      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      const { data } = await query

      if (data) {
        setPlans(data as any[])
        if (data.length > 0) {
          setSelectedPlanId(data[0].id)
        }
      }
      setLoading(false)
    }
    fetchPlans()
  }, [tenantId])

  const activePlan = plans.find(p => p.id === selectedPlanId)
  
  const m = calculateEMI(
    vehiclePrice,
    downPayment,
    activePlan ? Number(activePlan.interest_rate) : 0,
    tenure,
    activePlan ? Number(activePlan.processing_fee_percent) : 0
  )

  const check = isDownPaymentSufficient(
    vehiclePrice,
    downPayment,
    activePlan ? Number(activePlan.min_down_payment_percent) : 0
  )

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ${className}`}>
      
      {/* Left Configurator */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100">
            <Calculator size={18} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">EMI Parameter Configurator</h4>
            <p className="text-[11px] text-slate-500">Tune principal, down payments, and plan tenures</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Price */}
          <div className="space-y-2">
            <div className="flex justify-between items-center pl-2">
              <label className="text-xs text-slate-500">Vehicle ex-showroom value</label>
              <span className="text-sm font-bold text-slate-900">{formatINR(vehiclePrice)}</span>
            </div>
            <input
              type="range"
              min={200000}
              max={5000000}
              step={50000}
              value={vehiclePrice}
              onChange={e => {
                const val = Number(e.target.value)
                setVehiclePrice(val)
                if (downPayment > val) setDownPayment(Math.round(val * 0.2))
              }}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
          </div>

          {/* Downpayment */}
          <div className="space-y-2">
            <div className="flex justify-between items-center pl-2">
              <label className="text-xs text-slate-500">Downpayment equity</label>
              <span className="text-sm font-bold text-slate-900">
                {formatINR(downPayment)} ({vehiclePrice > 0 ? Math.round((downPayment / vehiclePrice) * 100) : 0}%)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={vehiclePrice}
              step={10000}
              value={downPayment}
              onChange={e => setDownPayment(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tenure */}
            <div className="space-y-2">
              <label className="text-xs text-slate-500 pl-4">Repayment Tenure</label>
              <select
                value={tenure}
                onChange={e => setTenure(Number(e.target.value))}
                className="w-full rounded-full py-3.5 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-slate-900 focus:bg-white outline-none appearance-none"
              >
                <option value={12}>12 Months (1 Year)</option>
                <option value={24}>24 Months (2 Years)</option>
                <option value={36}>36 Months (3 Years)</option>
                <option value={48}>48 Months (4 Years)</option>
                <option value={60}>60 Months (5 Years)</option>
                <option value={72}>72 Months (6 Years)</option>
                <option value={84}>84 Months (7 Years)</option>
              </select>
            </div>

            {/* Plan */}
            <div className="space-y-2">
              <label className="text-xs text-slate-500 pl-4">Finance Offer</label>
              <select
                value={selectedPlanId}
                onChange={e => setSelectedPlanId(e.target.value)}
                className="w-full rounded-full py-3.5 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-slate-900 focus:bg-white outline-none appearance-none"
              >
                {loading ? (
                  <option>Loading offers...</option>
                ) : plans.length === 0 ? (
                  <option>No offers available</option>
                ) : (
                  plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.finance_providers?.name} — {p.name} ({p.interest_rate}%)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Right Output Card */}
      <div className="lg:col-span-5 bg-slate-900 text-white rounded-[2.5rem] p-6 md:p-8 space-y-6">
        <div>
          <span className="text-xs text-slate-400">Monthly Outgoing Payment</span>
          <h3 className="text-3xl font-light tracking-tight text-white mt-1">{formatINR(m.monthlyEMI)}/mo</h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Interest applied: {activePlan?.interest_rate || 0}% per annum
          </p>
        </div>

        <div className="border-t border-slate-800 pt-5 space-y-3.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Net Loan Principal</span>
            <span className="font-semibold">{formatINR(m.loanAmount)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Processing charges ({activePlan?.processing_fee_percent || 0}%)</span>
            <span className="font-semibold">{formatINR(m.processingFee)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Total Interest Payable</span>
            <span className="font-semibold">{formatINR(m.totalInterest)}</span>
          </div>

          <div className="border-t border-slate-800 pt-4 flex justify-between text-base font-bold text-white">
            <span>Overall Loan Cost</span>
            <span className="text-lg">{formatINR(m.totalPayable)}</span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-800 flex items-start gap-3">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-slate-200 font-semibold">Down payment minimum validation</p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Minimum downpayment required is {activePlan?.min_down_payment_percent || 0}% ({formatINR(check.minRequired)}).
              {check.sufficient ? (
                <span className="text-emerald-400 font-bold ml-1">Condition met.</span>
              ) : (
                <span className="text-rose-400 font-bold ml-1">Increase down payment.</span>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
