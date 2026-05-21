'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Calculator, Landmark, ShieldCheck, HelpCircle, Layers } from 'lucide-react'

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

export default function SalesEMICalculatorPage() {
  const [plans, setPlans] = useState<FinancePlan[]>([])
  const [loading, setLoading] = useState(true)

  // Calculator inputs
  const [vehiclePrice, setVehiclePrice] = useState<number>(1000000)
  const [downPayment, setDownPayment] = useState<number>(200000)
  const [tenure, setTenure] = useState<number>(60)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  // Comparison State
  const [comparisonPlanIds, setComparisonPlanIds] = useState<string[]>([])

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function fetchPlans() {
      if (!profile) return
      setLoading(true)
      const { data, error } = await supabase
        .from('finance_plans')
        .select('*, finance_providers(id, name)')
        .eq('is_active', true)

      if (data) {
        setPlans(data as any[])
        if (data.length > 0) {
          setSelectedPlanId(data[0].id)
          // Default compare first two plans
          setComparisonPlanIds(data.slice(0, 2).map((p: any) => p.id))
        }
      }
      setLoading(false)
    }

    if (profile) {
      fetchPlans()
    }
  }, [profile])

  // Get active plan
  const activePlan = plans.find(p => p.id === selectedPlanId)

  // Calculate math for a specific plan
  const calculateEMIMetrics = (plan: FinancePlan | undefined, price: number, downPay: number, months: number) => {
    if (!plan) return { emi: 0, interest: 0, total: 0, fee: 0, loan: 0 }
    
    const loanAmount = Math.max(0, price - downPay)
    const annualRate = Number(plan.interest_rate) || 0
    const monthlyRate = annualRate / 12 / 100
    const feePercent = Number(plan.processing_fee_percent) || 0
    const feeAmount = (loanAmount * feePercent) / 100

    let monthlyEMI = 0
    if (loanAmount > 0) {
      if (monthlyRate > 0) {
        monthlyEMI = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
      } else {
        monthlyEMI = loanAmount / months
      }
    }

    const totalPayment = monthlyEMI * months
    const interestPayable = Math.max(0, totalPayment - loanAmount)

    return {
      emi: Math.round(monthlyEMI),
      interest: Math.round(interestPayable),
      total: Math.round(totalPayment + feeAmount),
      fee: Math.round(feeAmount),
      loan: loanAmount
    }
  }

  // Format currency
  const fmtINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  const metrics = calculateEMIMetrics(activePlan, vehiclePrice, downPayment, tenure)

  const handleComparisonToggle = (id: string) => {
    setComparisonPlanIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-8">
      {/* Primary Calculator Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Inputs */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Calculator className="text-slate-500" size={24} />
            <h3 className="text-lg text-slate-900 font-medium">EMI Loan Parameter Configurator</h3>
          </div>

          <div className="space-y-6">
            {/* Vehicle Ex-Showroom Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-center pl-4">
                <label className="text-sm text-slate-600">Vehicle Value / Price</label>
                <span className="text-sm font-semibold text-slate-900">{fmtINR(vehiclePrice)}</span>
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
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
              <div className="flex justify-between text-xs text-slate-400 pl-4 pr-4">
                <span>₹2L</span>
                <span>₹25L</span>
                <span>₹50L</span>
              </div>
            </div>

            {/* Down Payment */}
            <div className="space-y-2">
              <div className="flex justify-between items-center pl-4">
                <label className="text-sm text-slate-600">Down Payment (Equity contribution)</label>
                <span className="text-sm font-semibold text-slate-900">
                  {fmtINR(downPayment)} ({Math.round((downPayment / vehiclePrice) * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={vehiclePrice}
                step={10000}
                value={downPayment}
                onChange={e => setDownPayment(Number(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
              <div className="flex justify-between text-xs text-slate-400 pl-4 pr-4">
                <span>₹0 (Nil Down Payment)</span>
                <span>Full Price ({fmtINR(vehiclePrice)})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tenure Months */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Loan Tenure (Months)</label>
                <select
                  value={tenure}
                  onChange={e => setTenure(Number(e.target.value))}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
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

              {/* Finance Plan Select */}
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Finance Provider & Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  {loading ? (
                    <option>Loading plans...</option>
                  ) : plans.length === 0 ? (
                    <option>No plans available</option>
                  ) : (
                    plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.finance_providers?.name} - {p.name} ({p.interest_rate}%)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Math Outputs */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-10 space-y-6">
          <div>
            <p className="text-slate-400 text-sm">Monthly Outgoing</p>
            <h2 className="text-4xl mt-2 tracking-tight font-light text-white">{fmtINR(metrics.emi)}/mo</h2>
            <p className="text-xs text-slate-400 mt-1">Calculated at {activePlan?.interest_rate || 0}% annual interest rate</p>
          </div>

          <div className="border-t border-slate-800 pt-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Loan Amount</span>
              <span className="font-semibold text-slate-100">{fmtINR(metrics.loan)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Processing Fee ({activePlan?.processing_fee_percent || 0}%)</span>
              <span className="font-semibold text-slate-100">{fmtINR(metrics.fee)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Interest Payable</span>
              <span className="font-semibold text-slate-100">{fmtINR(metrics.interest)}</span>
            </div>

            <div className="border-t border-slate-800 pt-4 flex justify-between text-base">
              <span className="text-slate-300 font-medium">Total Cost (Loan + Fees)</span>
              <span className="font-bold text-white text-lg">{fmtINR(metrics.total)}</span>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-800 flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-medium">Down payment minimum check</p>
              <p className="text-[11px] text-slate-400 leading-normal">
                This plan requires a minimum down payment of {activePlan?.min_down_payment_percent || 0}% ({fmtINR((vehiclePrice * (activePlan?.min_down_payment_percent || 0)) / 100)}). 
                {downPayment >= (vehiclePrice * (activePlan?.min_down_payment_percent || 0)) / 100 ? (
                  <span className="text-emerald-400 ml-1 font-medium">Cleared</span>
                ) : (
                  <span className="text-rose-400 ml-1 font-medium">Increase down payment</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Engine Section */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Layers className="text-slate-500" size={24} />
            <h3 className="text-lg text-slate-900 font-medium">Side-by-Side Plan Comparison Matrix</h3>
          </div>
          <p className="text-xs text-slate-500">Toggle plan checkmarks to append them to comparison list</p>
        </div>

        {/* Plan Select Toggles */}
        <div className="flex flex-wrap gap-2">
          {plans.map(p => {
            const isCompared = comparisonPlanIds.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => handleComparisonToggle(p.id)}
                className={`rounded-full px-5 py-2.5 text-xs font-semibold border transition-all ${isCompared ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {p.finance_providers?.name} - {p.name}
              </button>
            )
          })}
        </div>

        {/* Side by Side Comparative Grid */}
        {comparisonPlanIds.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Select at least one plan from the toggles above to compare.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonPlanIds.map(id => {
              const plan = plans.find(p => p.id === id)
              if (!plan) return null
              const planMetrics = calculateEMIMetrics(plan, vehiclePrice, downPayment, tenure)

              return (
                <div key={id} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 flex flex-col justify-between gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5">
                        {plan.finance_providers?.name}
                      </span>
                      <h4 className="text-slate-900 font-medium text-base mt-2">{plan.name}</h4>
                    </div>

                    <div className="space-y-2 border-t border-slate-200/60 pt-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Interest Rate</span>
                        <span className="font-semibold text-slate-900">{plan.interest_rate}% p.a.</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Monthly EMI</span>
                        <span className="font-semibold text-slate-900">{fmtINR(planMetrics.emi)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total Interest</span>
                        <span className="font-semibold text-slate-900">{fmtINR(planMetrics.interest)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Processing Fee</span>
                        <span className="font-semibold text-slate-900">{fmtINR(planMetrics.fee)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-slate-200/60 pt-2">
                        <span className="text-slate-600 font-medium">Total Payable</span>
                        <span className="font-bold text-slate-900">{fmtINR(planMetrics.total)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-3 rounded-full hover:bg-slate-100 transition-colors mt-2"
                  >
                    Select Plan
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
