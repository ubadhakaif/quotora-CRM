'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, FileText, Search, CheckCircle, XCircle, ArrowRight, DollarSign, Percent, PlusCircle, Trash2, Printer, Landmark, Calculator } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { calculateEMI, isDownPaymentSufficient } from '@/lib/emi'

interface Model { id: string; name: string }
interface Variant { id: string; name: string; price: number; model_id: string }
interface Accessory { id: string; name: string; price: number }
interface Customer { id: string; name: string; phone: string | null }
interface FinancePlan {
  id: string
  provider_id: string
  name: string
  min_tenure_months: number
  max_tenure_months: number
  interest_rate: number
  processing_fee_percent: number
  min_down_payment_percent: number
  finance_providers?: { id: string; name: string } | null
}
interface Quotation {
  id: string
  status: string
  approval_status: string
  total_price: number
  discount_amount: number
  discount_percent: number
  created_at: string
  customer_id: string | null
  variant_id: string | null
  customers?: { name: string; phone: string | null } | null
  variants?: { name: string; price: number; models?: { name: string } | null } | null
  quotation_accessories?: { id: string; accessories?: { name: string; price: number } | null }[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
}

const approvalColors: Record<string, string> = {
  none: '',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
}

export default function SalesQuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [financePlans, setFinancePlans] = useState<FinancePlan[]>([])
  
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Builder Form State
  const [bCustomerId, setBCustomerId] = useState('')
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select')
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustEmail, setNewCustEmail] = useState('')
  const [newCustSource, setNewCustSource] = useState('walk-in')
  const [newCustStatus, setNewCustStatus] = useState('new')
  const [bModelId, setBModelId] = useState('')
  const [bVariantId, setBVariantId] = useState('')
  const [selectedAccIds, setSelectedAccIds] = useState<string[]>([])
  const [discountMode, setDiscountMode] = useState<'with_acc' | 'without_acc'>('without_acc')
  const [bDiscountAmt, setBDiscountAmt] = useState<number>(0)
  const [bDiscountPct, setBDiscountPct] = useState<number>(0)
  const [bNotes, setBNotes] = useState('')
  const [discountThreshold, setDiscountThreshold] = useState<number>(5) // default 5%
  
  // Loan / EMI parameters state
  const [includeLoan, setIncludeLoan] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [loanDownPayment, setLoanDownPayment] = useState(0)
  const [loanTenure, setLoanTenure] = useState(60)

  // Previewing details state
  const [previewingQuote, setPreviewingQuote] = useState<Quotation | null>(null)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    if (!profile?.id) return
    setLoading(true)
    
    const [quotesRes, customersRes, modelsRes, variantsRes, accRes, settingsRes, plansRes] = await Promise.all([
      supabase
        .from('quotations')
        .select('*, customers(name, phone), variants(name, price, models(name)), quotation_accessories(id, accessories(name, price))')
        .eq('created_by', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('id, name, phone')
        .eq('assigned_to', profile.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('models')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('variants')
        .select('id, name, price, model_id')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('accessories')
        .select('id, name, price')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('dealership_settings')
        .select('value')
        .eq('key', 'discount_threshold')
        .single(),
      supabase
        .from('finance_plans')
        .select('*, finance_providers(id, name)')
        .eq('is_active', true)
        .order('interest_rate')
    ])

    if (quotesRes.data) setQuotes(quotesRes.data as any[])
    if (customersRes.data) setCustomers(customersRes.data)
    if (modelsRes.data) setModels(modelsRes.data)
    if (variantsRes.data) setVariants(variantsRes.data as Variant[])
    if (accRes.data) setAccessories(accRes.data as Accessory[])
    if (plansRes.data) {
      setFinancePlans(plansRes.data as any[])
      if (plansRes.data.length > 0) {
        setSelectedPlanId(plansRes.data[0].id)
      }
    }
    
    if (settingsRes.data && typeof settingsRes.data.value === 'object') {
      const val = (settingsRes.data.value as any)?.percentage || 5
      setDiscountThreshold(Number(val))
    }

    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchAll()
    }
  }, [profile])

  // Calculation Math
  const activeVariant = variants.find(v => v.id === bVariantId)
  const exShowroom = activeVariant ? Number(activeVariant.price) : 0
  const gstTax = Math.round(exShowroom * 0.28) // 28% GST
  const tcsTax = exShowroom >= 1000000 ? Math.round(exShowroom * 0.01) : 0 // 1% TCS if over 10 Lakhs
  const roadTax = Math.round(exShowroom * 0.10) // 10% Road Tax / State Tax
  const rtoFee = Math.round(exShowroom * 0.02) // 2% RTO Fee
  const insuranceTax = Math.round(exShowroom * 0.04) // 4% Insurance
  
  const selectedAccessories = accessories.filter(a => selectedAccIds.includes(a.id))
  const accessoriesTotal = selectedAccessories.reduce((acc, a) => acc + Number(a.price), 0)
  
  const vehicleSubtotal = exShowroom + gstTax + tcsTax + roadTax + rtoFee + insuranceTax
  const subtotal = vehicleSubtotal + accessoriesTotal

  const finalOnRoadPrice = discountMode === 'with_acc'
    ? Math.max(0, subtotal - bDiscountAmt)
    : Math.max(0, vehicleSubtotal - bDiscountAmt) + accessoriesTotal

  // EMI Calculator output
  const activePlan = financePlans.find(p => p.id === selectedPlanId)
  const loanMetrics = calculateEMI(
    finalOnRoadPrice,
    loanDownPayment,
    activePlan ? Number(activePlan.interest_rate) : 0,
    loanTenure,
    activePlan ? Number(activePlan.processing_fee_percent) : 0
  )
  const dpCheck = isDownPaymentSufficient(
    finalOnRoadPrice,
    loanDownPayment,
    activePlan ? Number(activePlan.min_down_payment_percent) : 0
  )

  // Auto sync downpayment to 20% of on road price when variant changes
  useEffect(() => {
    if (finalOnRoadPrice > 0) {
      setLoanDownPayment(Math.round(finalOnRoadPrice * 0.20))
    } else {
      setLoanDownPayment(0)
    }
  }, [bVariantId])

  const handleOpenAdd = () => {
    setBCustomerId('')
    setCustomerMode('select')
    setNewCustName('')
    setNewCustPhone('')
    setNewCustEmail('')
    setNewCustSource('walk-in')
    setNewCustStatus('new')
    setBModelId('')
    setBVariantId('')
    setSelectedAccIds([])
    setDiscountMode('without_acc')
    setBDiscountAmt(0)
    setBDiscountPct(0)
    setBNotes('')
    setIncludeLoan(false)
    setLoanTenure(60)
    setPanelOpen(true)
    setPreviewingQuote(null)
  }

  const handleCloseAdd = () => {
    setPanelOpen(false)
  }

  const handleAccessoryToggle = (id: string) => {
    setSelectedAccIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleDiscountPctChange = (pctVal: number) => {
    const val = Math.min(100, Math.max(0, pctVal))
    setBDiscountPct(val)
    setBDiscountAmt(Math.round((subtotal * val) / 100))
  }

  const handleDiscountAmtChange = (amtVal: number) => {
    const val = Math.min(subtotal, Math.max(0, amtVal))
    setBDiscountAmt(val)
    setBDiscountPct(subtotal > 0 ? parseFloat(((val / subtotal) * 100).toFixed(2)) : 0)
  }

  const handleSaveQuotation = async () => {
    if (customerMode === 'select' && !bCustomerId) return
    if (customerMode === 'new' && !newCustName.trim()) return
    if (!bVariantId || !profile) return
    setSaving(true)

    let finalCustomerId = bCustomerId

    if (customerMode === 'new') {
      const newCustomer = {
        tenant_id: profile.tenant_id,
        branch_id: profile.branch_id,
        name: newCustName.trim(),
        phone: newCustPhone.trim() || null,
        email: newCustEmail.trim() || null,
        source: newCustSource,
        lead_status: newCustStatus,
        assigned_to: profile.id,
      }

      const { data: custData, error: custError } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single()

      if (custError) {
        addToast(`Failed to create customer: ${custError.message}`, 'error')
        setSaving(false)
        return
      }

      if (custData) {
        finalCustomerId = custData.id
        
        // Auto create a lead entry too for monitoring
        await supabase.from('leads').insert({
          tenant_id: profile.tenant_id,
          branch_id: profile.branch_id,
          customer_id: custData.id,
          assigned_to: profile.id,
          status: newCustStatus,
          source: newCustSource,
          notes: 'Customer created inline during Quotation Building'
        })
      }
    }

    // Check discount approval requirement
    const exceedsThreshold = bDiscountPct > discountThreshold
    const appStatus = exceedsThreshold ? 'pending' : 'none'
    const finalStatus = exceedsThreshold ? 'draft' : 'sent' // Auto mark as 'sent' if discount clears

    const newQuotation = {
      tenant_id: profile.tenant_id,
      branch_id: profile.branch_id,
      customer_id: finalCustomerId,
      variant_id: bVariantId,
      total_price: finalOnRoadPrice,
      discount_amount: bDiscountAmt,
      discount_percent: bDiscountPct,
      approval_status: appStatus,
      status: finalStatus,
      created_by: profile.id,
      notes: bNotes.trim() || null,
      tax_breakdown: {
        ex_showroom: exShowroom,
        gst: gstTax,
        tcs: tcsTax,
        road_tax: roadTax,
        rto_fee: rtoFee,
        insurance: insuranceTax,
        accessories: accessoriesTotal,
        discount_base_option: discountMode,
        finance: includeLoan ? {
          include_loan: true,
          provider_id: activePlan ? activePlan.provider_id : null,
          plan_id: selectedPlanId,
          interest_rate: activePlan ? Number(activePlan.interest_rate) : 0,
          down_payment: loanDownPayment,
          tenure_months: loanTenure,
          monthly_emi: loanMetrics.monthlyEMI,
          total_interest: loanMetrics.totalInterest,
          processing_fee: loanMetrics.processingFee,
          total_payable: loanMetrics.totalPayable
        } : {
          include_loan: false
        }
      }
    }

    const { data, error } = await supabase
      .from('quotations')
      .insert(newQuotation)
      .select()

    if (error) {
      addToast(error.message, 'error')
      setSaving(false)
      return
    }

    // Save quotation accessories if any are selected
    if (data && data[0] && selectedAccIds.length > 0) {
      const qAccEntries = selectedAccessories.map(acc => ({
        quotation_id: data[0].id,
        accessory_id: acc.id,
        price: acc.price
      }))

      const { error: accError } = await supabase.from('quotation_accessories').insert(qAccEntries)
      if (accError) addToast(`Quotation saved but accessories failed: ${accError.message}`, 'error')
    }

    // Auto-create CRM Note logging quotation creation
    if (finalCustomerId) {
      const noteContent = `Quotation builder finalized. Vehicle: ${activeVariant?.name}. On-Road Price: ${fmtINR(finalOnRoadPrice)} (Discount: ${bDiscountPct}%). Status: ${finalStatus.toUpperCase()} (Approval: ${appStatus})`
      await supabase.from('customer_notes').insert({
        tenant_id: profile.tenant_id,
        customer_id: finalCustomerId,
        created_by: profile.id,
        content: noteContent,
        note_type: 'general'
      })
    }

    if (exceedsThreshold) {
      addToast('Quotation saved as Draft. Discount exceeds threshold — Pending Manager Approval.', 'success')
      
      // Auto-escalate or create lead log alert
      await supabase.from('leads').update({ status: 'hot' }).eq('customer_id', finalCustomerId)
    } else {
      addToast('Quotation created and marked Sent successfully!', 'success')
    }

    handleCloseAdd()
    fetchAll()
    setSaving(false)
  }

  const handlePrint = (quote: Quotation) => {
    setPreviewingQuote(quote)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  const fmtINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  const filtered = quotes.filter(q => {
    const custName = q.customers?.name || ''
    const matchSearch = 
      custName.toLowerCase().includes(search.toLowerCase()) ||
      q.variants?.name.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  // Filter variants based on selected model
  const filteredVariants = variants.filter(v => v.model_id === bModelId)

  // Stats
  const totalValue = quotes.reduce((acc, q) => acc + Number(q.total_price || 0), 0)
  const pendingApprovalsCount = quotes.filter(q => q.approval_status === 'pending').length

  return (
    <div className="space-y-6">
      
      {/* Printable Area (Hidden unless printing) */}
      {previewingQuote && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-12 text-slate-900 space-y-6">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">OFFICIAL VEHICLE QUOTATION</h1>
              <p className="text-sm text-slate-500 mt-1">Quotora Automobile Systems</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">Quotation ID: #{previewingQuote.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-xs text-slate-500">Date: {new Date(previewingQuote.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-6 border-b border-slate-100">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Customer Details</h3>
              <p className="text-base font-semibold text-slate-900 mt-1">{previewingQuote.customers?.name}</p>
              <p className="text-sm text-slate-600">{previewingQuote.customers?.phone || 'No Phone'}</p>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">Sales Executive</h3>
              <p className="text-base font-semibold text-slate-900 mt-1">{profile?.name}</p>
              <p className="text-sm text-slate-600">{profile?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wider font-bold text-slate-900">Vehicle Description</h3>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
              <p className="text-lg font-bold text-slate-800">{previewingQuote.variants?.models?.name} — {previewingQuote.variants?.name}</p>
            </div>
          </div>

          <table className="w-full text-left border-collapse mt-8">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase tracking-wider font-bold text-slate-500">
                <th className="pb-3">Charge Component</th>
                <th className="pb-3 text-right">Price (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              <tr>
                <td className="py-3">Base Ex-Showroom price</td>
                <td className="py-3 text-right">{fmtINR(previewingQuote.variants?.price || 0)}</td>
              </tr>
              <tr>
                <td className="py-3">Automotive Goods & Service Tax (GST 28%)</td>
                <td className="py-3 text-right">{fmtINR((previewingQuote.variants?.price || 0) * 0.28)}</td>
              </tr>
              <tr>
                <td className="py-3">RTO Road Tax Registration (10%)</td>
                <td className="py-3 text-right">{fmtINR((previewingQuote.variants?.price || 0) * 0.10)}</td>
              </tr>
              <tr>
                <td className="py-3">Comprehensive Vehicle Insurance (3%)</td>
                <td className="py-3 text-right">{fmtINR((previewingQuote.variants?.price || 0) * 0.03)}</td>
              </tr>
              {previewingQuote.quotation_accessories && previewingQuote.quotation_accessories.length > 0 && (
                <tr>
                  <td className="py-3 font-medium">Optional Accessories Attached</td>
                  <td className="py-3 text-right font-medium">
                    {fmtINR(previewingQuote.quotation_accessories.reduce((acc, a) => acc + (a.accessories?.price || 0), 0))}
                  </td>
                </tr>
              )}
              {Number(previewingQuote.discount_amount) > 0 && (
                <tr className="text-emerald-600">
                  <td className="py-3 font-semibold">Dealership Discount Applied ({previewingQuote.discount_percent}%)</td>
                  <td className="py-3 text-right font-semibold">- {fmtINR(previewingQuote.discount_amount)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-900 font-bold text-base text-slate-900">
                <td className="py-4">TOTAL ON-ROAD PRICE OFFER</td>
                <td className="py-4 text-right">{fmtINR(previewingQuote.total_price)}</td>
              </tr>
            </tbody>
          </table>

          <div className="pt-12 text-center text-xs text-slate-400 border-t border-slate-100">
            This is a computer generated quote document valid for 15 days from date of printing.
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="My Total Quotes" value={quotes.length} icon={FileText} />
          <StatCard label="Pending Approvals" value={pendingApprovalsCount} icon={CheckCircle} />
          <StatCard label="My Pipeline Value" value={fmtINR(totalValue)} icon={FileText} />
        </div>
      )}

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quotations by customer name or vehicle..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        <button
          onClick={panelOpen ? handleCloseAdd : handleOpenAdd}
          className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors w-full md:w-auto shrink-0"
        >
          {panelOpen ? <X size={18} /> : <Plus size={18} />}
          {panelOpen ? 'Close panel' : 'New quotation'}
        </button>
      </div>

      {/* New Quotation Builder Panel */}
      {panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 space-y-6">
          <div>
            <h3 className="text-lg text-slate-900 pl-2">Step-by-Step On-Road Price Builder</h3>
            <p className="text-sm text-slate-500 pl-2 mt-1">Configure customer vehicle quote, add optional accessories, and calculate discount approvals.</p>
          </div>

          <div className="space-y-6">
            
            {/* Step 1: Customer Selection or Creation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <label className="text-sm font-semibold text-slate-900 pl-2">Step 1: Customer Profile</label>
                <div className="flex bg-slate-100 p-1 rounded-full text-xs">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('select')}
                    className={`rounded-full px-4 py-1.5 transition-all ${customerMode === 'select' ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new')}
                    className={`rounded-full px-4 py-1.5 transition-all ${customerMode === 'new' ? 'bg-white text-slate-900 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Create New
                  </button>
                </div>
              </div>

              {customerMode === 'select' ? (
                <div className="space-y-2">
                  <select
                    value={bCustomerId}
                    onChange={e => setBCustomerId(e.target.value)}
                    className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none text-sm"
                  >
                    <option value="">-- Select Assigned Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 pl-4 font-medium">Customer Name *</label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={e => setNewCustName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Phone Number</label>
                      <input
                        type="tel"
                        value={newCustPhone}
                        onChange={e => setNewCustPhone(e.target.value)}
                        placeholder="e.g. +91 99999 88888"
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Email Address</label>
                      <input
                        type="email"
                        value={newCustEmail}
                        onChange={e => setNewCustEmail(e.target.value)}
                        placeholder="e.g. john@example.com"
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Lead Source</label>
                      <select
                        value={newCustSource}
                        onChange={e => setNewCustSource(e.target.value)}
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 outline-none text-sm"
                      >
                        <option value="walk-in">Walk-in Visit</option>
                        <option value="phone">Phone Call</option>
                        <option value="web">Website Inquiry</option>
                        <option value="referral">Referral</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Lead Status</label>
                      <select
                        value={newCustStatus}
                        onChange={e => setNewCustStatus(e.target.value)}
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 outline-none text-sm"
                      >
                        <option value="new">New Lead</option>
                        <option value="hot">Hot (High Intent)</option>
                        <option value="warm">Warm (Medium Intent)</option>
                        <option value="cold">Cold (Low Intent)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Vehicle Model & Variant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Step 2a: Vehicle Model</label>
                <select
                  value={bModelId}
                  onChange={e => {
                    setBModelId(e.target.value)
                    setBVariantId('')
                  }}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="">-- Select Model --</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-600 pl-4">Step 2b: Model Variant Price</label>
                <select
                  value={bVariantId}
                  onChange={e => setBVariantId(e.target.value)}
                  disabled={!bModelId}
                  className="w-full rounded-full py-4 px-6 bg-slate-50 border border-slate-200 text-slate-900 focus:border-slate-900 focus:bg-white transition-all outline-none appearance-none disabled:opacity-50"
                >
                  <option value="">-- Choose Variant --</option>
                  {filteredVariants.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({fmtINR(v.price)})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 3: Optional Accessories */}
            {accessories.length > 0 && bVariantId && (
              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium text-slate-900 pl-2">Step 3: Optional Value-Added Accessories</label>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {accessories.map(acc => {
                    const isChecked = selectedAccIds.includes(acc.id)
                    return (
                      <label key={acc.id} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAccessoryToggle(acc.id)}
                          className="w-5 h-5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 transition-all"
                        />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                          {acc.name} ({fmtINR(acc.price)})
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 4 & 5: Pricing breakdown, Discount modes, and Loan Configurator */}
            {bVariantId && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Pricing Breakdown Card */}
                  <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-[2.5rem] p-6 md:p-8 space-y-4 text-sm text-slate-700">
                    <h4 className="font-semibold text-slate-900 mb-2 pl-2">Quotation Pricing Breakdown</h4>
                    
                    <div className="flex justify-between pl-2">
                      <span>Ex-Showroom Base Price</span>
                      <span className="font-medium text-slate-900">{fmtINR(exShowroom)}</span>
                    </div>

                    <div className="flex justify-between pl-2 text-xs text-slate-500">
                      <span>GST (28% Statutory Tax)</span>
                      <span>+ {fmtINR(gstTax)}</span>
                    </div>

                    {tcsTax > 0 && (
                      <div className="flex justify-between pl-2 text-xs text-slate-500">
                        <span>TCS (1% Tax Collected at Source)</span>
                        <span>+ {fmtINR(tcsTax)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pl-2 text-xs text-slate-500">
                      <span>Road Tax & State Charges (10%)</span>
                      <span>+ {fmtINR(roadTax)}</span>
                    </div>

                    <div className="flex justify-between pl-2 text-xs text-slate-500">
                      <span>RTO & Registration Fees (2%)</span>
                      <span>+ {fmtINR(rtoFee)}</span>
                    </div>

                    <div className="flex justify-between pl-2 text-xs text-slate-500">
                      <span>Comprehensive Motor Insurance (4%)</span>
                      <span>+ {fmtINR(insuranceTax)}</span>
                    </div>

                    <div className="flex justify-between pl-2 text-xs text-slate-500">
                      <span>Value-Added Accessories Total</span>
                      <span>+ {fmtINR(accessoriesTotal)}</span>
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex justify-between font-semibold text-slate-950 pl-2">
                      <span>Subtotal On-Road (before discount)</span>
                      <span>{fmtINR(subtotal)}</span>
                    </div>
                  </div>

                  {/* Discount Options and Input */}
                  <div className="lg:col-span-5 space-y-5 bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8">
                    <h4 className="font-semibold text-slate-900 pl-2">Step 4: Discount & Valuations</h4>
                    
                    {/* Discount Calculation Mode Selector */}
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 pl-4">Discount Base Application</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-full border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setDiscountMode('without_acc')}
                          className={`rounded-full py-2 px-3 text-xs font-semibold transition-all ${
                            discountMode === 'without_acc'
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Without Accessories
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountMode('with_acc')}
                          className={`rounded-full py-2 px-3 text-xs font-semibold transition-all ${
                            discountMode === 'with_acc'
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          With Accessories
                        </button>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs text-slate-500 pl-4">Discount (%)</label>
                        <div className="relative">
                          <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            step={0.1}
                            value={bDiscountPct || ''}
                            onChange={e => handleDiscountPctChange(Number(e.target.value))}
                            placeholder="e.g. 3"
                            className="w-full rounded-full py-3 pl-10 pr-4 bg-slate-50 border border-slate-200 text-sm outline-none focus:border-slate-900 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-slate-500 pl-4">Discount (INR)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₹</span>
                          <input
                            type="number"
                            value={bDiscountAmt || ''}
                            onChange={e => handleDiscountAmtChange(Number(e.target.value))}
                            placeholder="e.g. 50000"
                            className="w-full rounded-full py-3 pl-10 pr-4 bg-slate-50 border border-slate-200 text-sm outline-none focus:border-slate-900 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {bDiscountPct > discountThreshold && (
                      <div className="bg-amber-50 text-amber-800 text-xs rounded-2xl p-4 border border-amber-200 leading-normal">
                        ⚠️ Discount rate of <strong>{bDiscountPct}%</strong> exceeds the standard threshold of {discountThreshold}%. 
                        This quote will be locked in <strong>Draft status</strong> pending Branch Manager approval.
                      </div>
                    )}

                    <div className="bg-slate-900 text-white rounded-[2rem] p-5 text-center">
                      <p className="text-xs text-slate-400">Final On-Road price offer</p>
                      <p className="text-2xl font-bold mt-1 text-white">{fmtINR(finalOnRoadPrice)}</p>
                    </div>
                  </div>
                </div>

                {/* Step 5: Integrated Finance & Loan Planner */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100">
                        <Landmark size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Step 5: Integrated Finance & Loan Planner</h4>
                        <p className="text-[11px] text-slate-500">Configure EMI installment projections and downpayment limits</p>
                      </div>
                    </div>
                    
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeLoan}
                        onChange={e => setIncludeLoan(e.target.checked)}
                        className="w-5 h-5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 transition-all"
                      />
                      <span className="text-xs font-semibold text-slate-700">Add EMI Planning to Quotation</span>
                    </label>
                  </div>

                  {includeLoan && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left: Tuner */}
                      <div className="lg:col-span-7 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Plan Offer */}
                          <div className="space-y-2">
                            <label className="text-xs text-slate-500 pl-4 font-medium">Finance Offer Plan</label>
                            <select
                              value={selectedPlanId}
                              onChange={e => setSelectedPlanId(e.target.value)}
                              className="w-full rounded-full py-3.5 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-slate-900 focus:bg-white outline-none appearance-none"
                            >
                              {financePlans.length === 0 ? (
                                <option>No active plans found</option>
                              ) : (
                                financePlans.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.finance_providers?.name} — {p.name} ({p.interest_rate}%)
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          {/* Tenure */}
                          <div className="space-y-2">
                            <label className="text-xs text-slate-500 pl-4 font-medium">Loan Repayment Tenure</label>
                            <select
                              value={loanTenure}
                              onChange={e => setLoanTenure(Number(e.target.value))}
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
                        </div>

                        {/* Down Payment config */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pl-2">
                            <label className="text-xs text-slate-500 font-medium">Downpayment Equity</label>
                            <span className="text-sm font-bold text-slate-950">
                              {fmtINR(loanDownPayment)} ({finalOnRoadPrice > 0 ? Math.round((loanDownPayment / finalOnRoadPrice) * 100) : 0}%)
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                            <div className="sm:col-span-8">
                              <input
                                type="range"
                                min={0}
                                max={finalOnRoadPrice}
                                step={10000}
                                value={loanDownPayment}
                                onChange={e => setLoanDownPayment(Number(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                              />
                            </div>
                            <div className="sm:col-span-4 relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₹</span>
                              <input
                                type="number"
                                min={0}
                                max={finalOnRoadPrice}
                                value={loanDownPayment || ''}
                                onChange={e => setLoanDownPayment(Math.min(finalOnRoadPrice, Math.max(0, Number(e.target.value))))}
                                className="w-full rounded-full py-2.5 pl-8 pr-4 bg-slate-50 border border-slate-200 text-xs outline-none focus:border-slate-900 focus:bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Sufficiency notice check */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 flex items-start gap-3 text-xs leading-relaxed text-slate-600">
                          <Calculator size={18} className="text-slate-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-800">Minimum plan requirements</p>
                            <p className="mt-0.5">
                              Minimum required downpayment for this plan is {activePlan?.min_down_payment_percent || 0}% ({fmtINR(dpCheck.minRequired)}).
                              {dpCheck.sufficient ? (
                                <span className="text-emerald-600 font-bold ml-1">Downpayment is sufficient!</span>
                              ) : (
                                <span className="text-rose-600 font-bold ml-1">Insufficient downpayment. Please adjust to continue.</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: EMI Output Breakdown */}
                      <div className="lg:col-span-5 bg-slate-900 text-white rounded-[2rem] p-6 space-y-4">
                        <div>
                          <span className="text-xs text-slate-400">Monthly Outgoing Payment</span>
                          <h3 className="text-2xl font-light tracking-tight text-white mt-0.5">{fmtINR(loanMetrics.monthlyEMI)}/mo</h3>
                          <p className="text-[10px] text-slate-400">
                            Interest applied: {activePlan?.interest_rate || 0}% per annum
                          </p>
                        </div>

                        <div className="border-t border-slate-800 pt-4 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Net Loan Principal</span>
                            <span className="font-semibold">{fmtINR(loanMetrics.loanAmount)}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">Processing Fee ({activePlan?.processing_fee_percent || 0}%)</span>
                            <span className="font-semibold">{fmtINR(loanMetrics.processingFee)}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-400">Total Interest Payable</span>
                            <span className="font-semibold">{fmtINR(loanMetrics.totalInterest)}</span>
                          </div>

                          <div className="border-t border-slate-800 pt-3 flex justify-between text-sm font-bold text-white">
                            <span>Overall Loan Cost</span>
                            <span className="text-base text-white">{fmtINR(loanMetrics.totalPayable)}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm text-slate-600 pl-4">Appraisal Notes (Optional)</label>
              <textarea
                value={bNotes}
                onChange={e => setBNotes(e.target.value)}
                placeholder="Mention valid date extensions, special dealership concessions or corporate references..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleCloseAdd}
              className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
            >
              Cancel
            </button>
             <button
              onClick={handleSaveQuotation}
              disabled={(customerMode === 'select' && !bCustomerId) || (customerMode === 'new' && !newCustName.trim()) || !bVariantId || saving}
              className="bg-slate-900 text-white rounded-full px-8 py-4 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
            >
              {saving ? 'Creating...' : bDiscountPct > discountThreshold ? 'Save for Approval' : 'Create & Finalize'}
            </button>
          </div>
        </div>
      )}

      {/* Quotations List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[2rem]" />)}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(q => {
              const cust = q.customers?.name || '—'
              const varName = q.variants?.name || '—'
              const isPending = q.approval_status === 'pending'
              
              return (
                <div key={q.id} className="p-6 md:p-8 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50 transition-colors">
                  
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                      <FileText size={22} />
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-slate-900 font-medium text-lg truncate">{cust}</p>
                        <span className={`text-[10px] rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider ${statusColors[q.status] || ''}`}>
                          {q.status}
                        </span>
                        {q.approval_status && q.approval_status !== 'none' && (
                          <span className={`text-[10px] rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider ${approvalColors[q.approval_status]}`}>
                            {q.approval_status === 'pending' ? 'Approval Pending' : `Discount ${q.approval_status}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate mt-1">
                        Vehicle: <span className="font-semibold text-slate-700">{q.variants?.models?.name} — {varName}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{fmtINR(q.total_price)}</p>
                      {Number(q.discount_amount) > 0 && (
                        <p className="text-xs text-emerald-600 font-semibold">- {fmtINR(q.discount_amount)} discount</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handlePrint(q)}
                      className="p-3 text-slate-600 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors border border-slate-200"
                      title="Print Quotation"
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                  
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="p-16 text-center text-slate-500">No quotations found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
