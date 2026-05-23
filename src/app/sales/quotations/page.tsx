'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Plus, X, FileText, Search, CheckCircle, XCircle, ArrowRight, DollarSign, Percent, PlusCircle, Trash2, Printer, Landmark, Calculator, Car, Wrench } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { calculateEMI, isDownPaymentSufficient } from '@/lib/emi'

interface Model { id: string; name: string }
interface FuelType { id: string; name: string }
interface TransType { id: string; name: string }
interface Variant {
  id: string
  name: string
  price: number
  model_id: string
  image_url: string | null
  fuel_type_ids?: string[] | null
  transmission_type_ids?: string[] | null
  fuel_types?: { name: string } | null
  transmission_types?: { name: string } | null
}
interface Accessory { id: string; name: string; price: number; image_url: string | null }
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
  tax_breakdown?: any
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
  const [panelOpen, setPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new')
  const [allFuels, setAllFuels] = useState<FuelType[]>([])
  const [allTrans, setAllTrans] = useState<TransType[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Follow-up Scheduling state
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false)
  const [followUpDueDate, setFollowUpDueDate] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')

  // Builder Form State
  const [bCustomerId, setBCustomerId] = useState('')
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('new')
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustEmail, setNewCustEmail] = useState('')
  const [newCustSource, setNewCustSource] = useState('walk-in')
  const [newCustStatus, setNewCustStatus] = useState('new')
  const [newCustAddress, setNewCustAddress] = useState('')
  const [bModelId, setBModelId] = useState('')
  const [bVariantId, setBVariantId] = useState('')
  const [bFuelId, setBFuelId] = useState('')
  const [bTransId, setBTransId] = useState('')
  const [selectedAccIds, setSelectedAccIds] = useState<string[]>([])
  const [discountMode, setDiscountMode] = useState<'with_acc' | 'without_acc'>('without_acc')
  const [bDiscountAmt, setBDiscountAmt] = useState<number>(0)
  const [bDiscountPct, setBDiscountPct] = useState<number>(0)
  const [bNotes, setBNotes] = useState('')
  const [discountThreshold, setDiscountThreshold] = useState<number>(5) // default 5%

  // Likely Purchase, Mode of Purchase, and document attachments state
  const [likelyPurchase, setLikelyPurchase] = useState<'first_time' | 'additional' | 'replacement'>('first_time')
  const [exchangeImages, setExchangeImages] = useState<string[]>([])
  const [exchangeRcCopy, setExchangeRcCopy] = useState<string | null>(null)
  const [exchangeInsurance, setExchangeInsurance] = useState<string | null>(null)
  const [exchangeNoc, setExchangeNoc] = useState<string | null>(null)

  const [modeOfPurchase, setModeOfPurchase] = useState<'cash' | 'loan' | 'other'>('cash')
  const [modeOfPurchaseOtherText, setModeOfPurchaseOtherText] = useState('')
  const [loanAadharFront, setLoanAadharFront] = useState<string | null>(null)
  const [loanAadharBack, setLoanAadharBack] = useState<string | null>(null)
  const [loanPanFront, setLoanPanFront] = useState<string | null>(null)
  const [loanPanBack, setLoanPanBack] = useState<string | null>(null)
  
  // Dynamic statutory settings loaded from database
  const [cgstRate, setCgstRate] = useState(14) // default 14%
  const [sgstRate, setSgstRate] = useState(14) // default 14%
  const [tcsThresholdSetting, setTcsThresholdSetting] = useState(1000000) // default 10L
  const [tcsRateSetting, setTcsRateSetting] = useState(1) // default 1%
  const [roadTaxRate, setRoadTaxRate] = useState(10) // default 10%
  const [rtoFeeRate, setRtoFeeRate] = useState(5000) // default flat fee 5000 INR
  const [insuranceRate, setInsuranceRate] = useState(4) // default 4%
  
  // Loan / EMI parameters state
  const [customInterestRate, setCustomInterestRate] = useState<number | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [loanDownPayment, setLoanDownPayment] = useState(0)
  const [loanTenure, setLoanTenure] = useState(60)

  // Manual overrides for tax and insurance (now percentage values)
  const [customGstPct, setCustomGstPct] = useState<number | null>(null)
  const [customTcsPct, setCustomTcsPct] = useState<number | null>(null)
  const [customRoadTaxPct, setCustomRoadTaxPct] = useState<number | null>(null)
  const [customRtoFeePct, setCustomRtoFeePct] = useState<number | null>(null)
  const [customInsurancePct, setCustomInsurancePct] = useState<number | null>(null)
  const [customOtherCharges, setCustomOtherCharges] = useState<number>(0)

  // Exchange / Trade-In state
  const [exchangeMake, setExchangeMake] = useState('')
  const [exchangeModel, setExchangeModel] = useState('')
  const [exchangeYear, setExchangeYear] = useState('')
  const [exchangeKms, setExchangeKms] = useState('')
  const [exchangeCondition, setExchangeCondition] = useState('good')
  const [exchangeValuation, setExchangeValuation] = useState('')
  const [exchangeNotes, setExchangeNotes] = useState('')

  // Previewing details state
  const [previewingQuote, setPreviewingQuote] = useState<Quotation | null>(null)

  const { profile } = useAuth()
  const { addToast } = useToast()
  const supabase = createClient()

  const fetchAll = async () => {
    if (!profile?.id) return
    setLoading(true)
    
    const [quotesRes, customersRes, modelsRes, variantsRes, accRes, settingsRes, plansRes, fuelsRes, transRes] = await Promise.all([
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
        .select('id, name, price, model_id, image_url, fuel_type_ids, transmission_type_ids, fuel_types(name), transmission_types(name)')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('accessories')
        .select('id, name, price, image_url')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('dealership_settings')
        .select('key, value'),
      supabase
        .from('finance_plans')
        .select('*, finance_providers(id, name)')
        .eq('is_active', true)
        .order('interest_rate'),
      supabase
        .from('fuel_types')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('transmission_types')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
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
    if (fuelsRes.data) setAllFuels(fuelsRes.data)
    if (transRes.data) setAllTrans(transRes.data)
    
    if (settingsRes.data && Array.isArray(settingsRes.data)) {
      const settingsMap: Record<string, any> = {}
      settingsRes.data.forEach((item: any) => {
        settingsMap[item.key] = item.value
      })

      // Parse discount threshold
      if (settingsMap['quotation.max_auto_discount_percent'] !== undefined) {
        setDiscountThreshold(Number(settingsMap['quotation.max_auto_discount_percent']))
      } else if (settingsMap['discount_threshold']?.percentage !== undefined) {
        setDiscountThreshold(Number(settingsMap['discount_threshold'].percentage))
      }

      // Parse tax settings
      if (settingsMap['tax.cgst_percent'] !== undefined) setCgstRate(Number(settingsMap['tax.cgst_percent']))
      if (settingsMap['tax.sgst_percent'] !== undefined) setSgstRate(Number(settingsMap['tax.sgst_percent']))
      if (settingsMap['tax.tcs_threshold'] !== undefined) setTcsThresholdSetting(Number(settingsMap['tax.tcs_threshold']))
      if (settingsMap['tax.tcs_percent'] !== undefined) setTcsRateSetting(Number(settingsMap['tax.tcs_percent']))
      if (settingsMap['tax.road_tax_percent'] !== undefined) setRoadTaxRate(Number(settingsMap['tax.road_tax_percent']))
      if (settingsMap['tax.rto_fee_percent'] !== undefined) setRtoFeeRate(Number(settingsMap['tax.rto_fee_percent']))
      if (settingsMap['tax.insurance_percent'] !== undefined) setInsuranceRate(Number(settingsMap['tax.insurance_percent']))
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

  const gstPct = customGstPct !== null ? customGstPct : (cgstRate + sgstRate)
  const tcsPct = customTcsPct !== null ? customTcsPct : tcsRateSetting
  const roadTaxPct = customRoadTaxPct !== null ? customRoadTaxPct : roadTaxRate
  const insurancePct = customInsurancePct !== null ? customInsurancePct : insuranceRate

  const gstTax = Math.round(exShowroom * (gstPct / 100))
  const tcsTax = exShowroom >= tcsThresholdSetting ? Math.round(exShowroom * (tcsPct / 100)) : 0
  const roadTax = Math.round(exShowroom * (roadTaxPct / 100))
  const rtoFee = Math.round(customRtoFeePct !== null ? customRtoFeePct : rtoFeeRate)
  const insuranceTax = Math.round(exShowroom * (insurancePct / 100))
  const otherCharges = customOtherCharges
  
  const selectedAccessories = accessories.filter(a => selectedAccIds.includes(a.id))
  const accessoriesTotal = selectedAccessories.reduce((acc, a) => acc + Number(a.price), 0)
  
  const vehicleSubtotal = exShowroom + gstTax + tcsTax + roadTax + rtoFee + insuranceTax + otherCharges
  const subtotal = vehicleSubtotal + accessoriesTotal

  // Keep flat discount amount synchronized with discount percentage and base mode
  useEffect(() => {
    const baseForDiscount = discountMode === 'with_acc' ? subtotal : vehicleSubtotal
    const calculatedAmt = Math.round((baseForDiscount * bDiscountPct) / 100)
    setBDiscountAmt(calculatedAmt)
  }, [discountMode, vehicleSubtotal, accessoriesTotal, bDiscountPct, gstTax, tcsTax, roadTax, rtoFee, insuranceTax, otherCharges])

  // Reset custom overrides when variant is changed
  useEffect(() => {
    setCustomGstPct(null)
    setCustomTcsPct(null)
    setCustomRoadTaxPct(null)
    setCustomRtoFeePct(null)
    setCustomInsurancePct(null)
    setCustomOtherCharges(0)
    setLikelyPurchase('first_time')
    setExchangeMake('')
    setExchangeModel('')
    setExchangeYear('')
    setExchangeKms('')
    setExchangeValuation('')
    setExchangeNotes('')
    setBFuelId('')
    setBTransId('')
  }, [bVariantId])

  // Reset custom interest rate override when plan changes
  useEffect(() => {
    setCustomInterestRate(null)
  }, [selectedPlanId])

  const hasExchange = likelyPurchase === 'replacement'
  const includeLoan = modeOfPurchase === 'loan'

  const exchangeValue = hasExchange && exchangeValuation ? Number(exchangeValuation) : 0
  const finalPriceBeforeExchange = discountMode === 'with_acc'
    ? Math.max(0, subtotal - bDiscountAmt)
    : Math.max(0, vehicleSubtotal - bDiscountAmt) + accessoriesTotal

  const finalOnRoadPrice = Math.max(0, finalPriceBeforeExchange - exchangeValue)

  // EMI Calculator output
  const activePlan = financePlans.find(p => p.id === selectedPlanId)
  const interestRate = customInterestRate !== null ? customInterestRate : (activePlan ? Number(activePlan.interest_rate) : 0)
  const loanMetrics = calculateEMI(
    finalOnRoadPrice,
    loanDownPayment,
    interestRate,
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
    setCustomerMode('new')
    setNewCustName('')
    setNewCustPhone('')
    setNewCustEmail('')
    setNewCustSource('walk-in')
    setNewCustStatus('new')
    setNewCustAddress('')
    setBModelId('')
    setBVariantId('')
    setBFuelId('')
    setBTransId('')
    setSelectedAccIds([])
    setDiscountMode('without_acc')
    setBDiscountAmt(0)
    setBDiscountPct(0)
    setBNotes('')
    setCustomInterestRate(null)
    setLoanTenure(60)
    
    // Reset likely purchase, mode of purchase and uploads
    setLikelyPurchase('first_time')
    setExchangeImages([])
    setExchangeRcCopy(null)
    setExchangeInsurance(null)
    setExchangeNoc(null)
    setModeOfPurchase('cash')
    setModeOfPurchaseOtherText('')
    setLoanAadharFront(null)
    setLoanAadharBack(null)
    setLoanPanFront(null)
    setLoanPanBack(null)

    // Reset follow-up state
    setScheduleFollowUp(false)
    setFollowUpDueDate('')
    setFollowUpNotes('')
    
    setPanelOpen(true)
    setActiveTab('new')
    setPreviewingQuote(null)
  }

  const handleCloseAdd = () => {
    setPanelOpen(false)
    setActiveTab('list')
    setScheduleFollowUp(false)
    setFollowUpDueDate('')
    setFollowUpNotes('')
  }

  const handleAccessoryToggle = (id: string) => {
    setSelectedAccIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleDiscountPctChange = (pctVal: number) => {
    const val = Math.min(100, Math.max(0, pctVal))
    setBDiscountPct(val)
  }

  const handleDiscountAmtChange = (amtVal: number) => {
    const baseForDiscount = discountMode === 'with_acc' ? subtotal : vehicleSubtotal
    const val = Math.min(baseForDiscount, Math.max(0, amtVal))
    const pct = baseForDiscount > 0 ? parseFloat(((val / baseForDiscount) * 100).toFixed(2)) : 0
    setBDiscountPct(pct)
  }

  const handleSaveQuotation = async () => {
    if (customerMode === 'select' && !bCustomerId) return
    if (customerMode === 'new' && !newCustName.trim()) return
    if (!bVariantId || !profile) return
    setSaving(true)

    const availableFuels = allFuels.filter(f => activeVariant?.fuel_type_ids?.includes(f.id))
    const availableTrans = allTrans.filter(t => activeVariant?.transmission_type_ids?.includes(t.id))

    if (availableFuels.length > 0 && !bFuelId) {
      addToast('Please select a fuel type configuration.', 'error')
      setSaving(false)
      return
    }
    if (availableTrans.length > 0 && !bTransId) {
      addToast('Please select a transmission configuration.', 'error')
      setSaving(false)
      return
    }

    const chosenFuelName = availableFuels.find(f => f.id === bFuelId)?.name || null
    const chosenTransName = availableTrans.find(t => t.id === bTransId)?.name || null

    // 1. Mobile Number (10 digits) validation
    if (customerMode === 'new') {
      const cleanedPhone = newCustPhone.replace(/\D/g, '')
      if (cleanedPhone.length !== 10) {
        addToast('Customer Mobile Number must be exactly 10 digits.', 'error')
        setSaving(false)
        return
      }
    }

    // 2. Replacement/Exchange validations
    if (likelyPurchase === 'replacement') {
      if (exchangeImages.length < 4) {
        addToast('Please upload at least 4 images of the vehicle for exchange/replacement.', 'error')
        setSaving(false)
        return
      }
      if (!exchangeRcCopy) {
        addToast('Please upload a copy of the RC.', 'error')
        setSaving(false)
        return
      }
      if (!exchangeInsurance) {
        addToast('Please upload a copy of the Insurance.', 'error')
        setSaving(false)
        return
      }
      if (!exchangeNoc) {
        addToast('Please upload a copy of the NOC.', 'error')
        setSaving(false)
        return
      }
      if (!exchangeMake.trim() || !exchangeModel.trim() || !exchangeValuation) {
        addToast('Please enter the exchange vehicle make, model, and valuation details.', 'error')
        setSaving(false)
        return
      }
    }

    // 3. Mode of purchase validation
    if (modeOfPurchase === 'loan') {
      if (!loanAadharFront || !loanAadharBack) {
        addToast('Please upload both front and back sides of the Aadhar Card.', 'error')
        setSaving(false)
        return
      }
      if (!loanPanFront || !loanPanBack) {
        addToast('Please upload both front and back sides of the PAN Card.', 'error')
        setSaving(false)
        return
      }
    } else if (modeOfPurchase === 'other' && !modeOfPurchaseOtherText.trim()) {
      addToast('Please specify the details for other purchase mode.', 'error')
      setSaving(false)
      return
    }

    // 3.5. Follow-up scheduling validation
    if (scheduleFollowUp) {
      if (!followUpDueDate) {
        addToast('Please select a date and time for the scheduled follow-up.', 'error')
        setSaving(false)
        return
      }
      if (!followUpNotes.trim()) {
        addToast('Please enter action notes for the follow-up.', 'error')
        setSaving(false)
        return
      }
    }

    // 4. Capture GPS Coordinates
    let lat: number | null = null
    let lng: number | null = null
    try {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null)
          return
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (err) => {
            console.warn('Geolocation error:', err)
            resolve(null)
          },
          { enableHighAccuracy: true, timeout: 4000 }
        )
      })
      if (pos) {
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      }
    } catch (err) {
      console.warn('Failed to capture GPS:', err)
    }

    let finalCustomerId = bCustomerId

    if (customerMode === 'new') {
      const newCustomer = {
        tenant_id: profile.tenant_id,
        branch_id: profile.branch_id,
        name: newCustName.trim(),
        phone: newCustPhone.trim() || null,
        email: newCustEmail.trim() || null,
        address: newCustAddress.trim() || null,
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
      selected_fuel_type_id: bFuelId || null,
      selected_transmission_type_id: bTransId || null,
      total_price: finalOnRoadPrice,
      discount_amount: bDiscountAmt,
      discount_percent: bDiscountPct,
      approval_status: appStatus,
      status: finalStatus,
      created_by: profile.id,
      notes: bNotes.trim() || null,
      
      // New columns from migrations
      likely_purchase: likelyPurchase,
      exchange_images: likelyPurchase === 'replacement' ? exchangeImages : [],
      exchange_rc_copy: likelyPurchase === 'replacement' ? exchangeRcCopy : null,
      exchange_insurance: likelyPurchase === 'replacement' ? exchangeInsurance : null,
      exchange_noc: likelyPurchase === 'replacement' ? exchangeNoc : null,
      mode_of_purchase: modeOfPurchase,
      mode_of_purchase_other: modeOfPurchase === 'other' ? modeOfPurchaseOtherText.trim() : null,
      loan_aadhar_front: modeOfPurchase === 'loan' ? loanAadharFront : null,
      loan_aadhar_back: modeOfPurchase === 'loan' ? loanAadharBack : null,
      loan_pan_front: modeOfPurchase === 'loan' ? loanPanFront : null,
      loan_pan_back: modeOfPurchase === 'loan' ? loanPanBack : null,
      latitude: lat,
      longitude: lng,

      tax_breakdown: {
        ex_showroom: exShowroom,
        gst: gstTax,
        tcs: tcsTax,
        road_tax: roadTax,
        rto_fee: rtoFee,
        insurance: insuranceTax,
        other_charges: otherCharges,
        accessories: accessoriesTotal,
        discount_base_option: discountMode,
        selected_specifications: {
          fuel_type_id: bFuelId || null,
          transmission_type_id: bTransId || null,
          fuel_name: chosenFuelName,
          transmission_name: chosenTransName
        },
        finance: includeLoan ? {
          include_loan: true,
          provider_id: activePlan ? activePlan.provider_id : null,
          plan_id: selectedPlanId,
          interest_rate: interestRate,
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

    // Save exchange vehicle if toggled and filled
    if (data && data[0] && hasExchange && exchangeMake.trim() && exchangeModel.trim()) {
      const exchangeVal = exchangeValuation ? Number(exchangeValuation) : 0
      const newExchange = {
        tenant_id: profile.tenant_id,
        quotation_id: data[0].id,
        make: exchangeMake.trim(),
        model: exchangeModel.trim(),
        year: exchangeYear ? Number(exchangeYear) : null,
        kms_driven: exchangeKms ? Number(exchangeKms) : null,
        condition: exchangeCondition,
        estimated_value: exchangeVal,
        notes: exchangeNotes.trim() || null,
      }

      const { error: exchangeError } = await supabase.from('exchange_vehicles').insert(newExchange)
      if (exchangeError) {
        addToast(`Quotation saved but exchange vehicle failed: ${exchangeError.message}`, 'error')
      } else {
        // Create appraisal customer note
        if (finalCustomerId) {
          await supabase.from('customer_notes').insert({
            tenant_id: profile.tenant_id,
            customer_id: finalCustomerId,
            created_by: profile.id,
            content: `Trade-in exchange vehicle appraised and logged: ${exchangeMake.trim()} ${exchangeModel.trim()} (${exchangeYear || 'N/A'}). Valuation subtracted: ₹${exchangeVal.toLocaleString('en-IN')}`,
            note_type: 'general'
          })
        }
      }
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

    // Schedule Follow-up if enabled
    if (scheduleFollowUp && followUpDueDate && finalCustomerId) {
      const newFollowUp = {
        tenant_id: profile.tenant_id,
        branch_id: profile.branch_id,
        customer_id: finalCustomerId,
        assigned_to: profile.id,
        due_date: new Date(followUpDueDate).toISOString(),
        status: 'pending',
        notes: followUpNotes.trim() || 'Follow-up scheduled from Quotation Builder'
      }

      const { error: fError } = await supabase.from('follow_ups').insert(newFollowUp)
      if (fError) {
        addToast(`Quotation saved but follow-up failed: ${fError.message}`, 'error')
      } else {
        // Auto-create interaction note
        await supabase.from('customer_notes').insert({
          tenant_id: profile.tenant_id,
          customer_id: finalCustomerId,
          created_by: profile.id,
          content: `Future follow-up scheduled for: ${new Date(followUpDueDate).toLocaleString()}. Objective: ${followUpNotes.trim()}`,
          note_type: 'general'
        })
        addToast('Follow-up scheduled successfully!', 'success')
      }
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
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-slate-800">{previewingQuote.variants?.models?.name} — {previewingQuote.variants?.name}</p>
                {previewingQuote.tax_breakdown?.selected_specifications && (
                  <div className="flex gap-2 mt-1.5">
                    {previewingQuote.tax_breakdown.selected_specifications.fuel_name && (
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                        ⛽ {previewingQuote.tax_breakdown.selected_specifications.fuel_name}
                      </span>
                    )}
                    {previewingQuote.tax_breakdown.selected_specifications.transmission_name && (
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                        ⚙️ {previewingQuote.tax_breakdown.selected_specifications.transmission_name}
                      </span>
                    )}
                  </div>
                )}
              </div>
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
                <td className="py-3 text-right">{fmtINR(previewingQuote.tax_breakdown?.ex_showroom || previewingQuote.variants?.price || 0)}</td>
              </tr>
              <tr>
                <td className="py-3">Automotive Goods & Service Tax (GST)</td>
                <td className="py-3 text-right">{fmtINR(previewingQuote.tax_breakdown?.gst || 0)}</td>
              </tr>
              {previewingQuote.tax_breakdown?.tcs > 0 && (
                <tr>
                  <td className="py-3">TCS (Tax Collected at Source)</td>
                  <td className="py-3 text-right">{fmtINR(previewingQuote.tax_breakdown.tcs)}</td>
                </tr>
              )}
              <tr>
                <td className="py-3">Road Tax & State Surcharges</td>
                <td className="py-3 text-right">{fmtINR(previewingQuote.tax_breakdown?.road_tax || 0)}</td>
              </tr>
              <tr>
                <td className="py-3">RTO & Registration Fees</td>
                <td className="py-3 text-right">{fmtINR(previewingQuote.tax_breakdown?.rto_fee || 0)}</td>
              </tr>
              <tr>
                <td className="py-3">Comprehensive Vehicle Insurance</td>
                <td className="py-3 text-right">{fmtINR(previewingQuote.tax_breakdown?.insurance || 0)}</td>
              </tr>
              {previewingQuote.tax_breakdown?.other_charges > 0 && (
                <tr>
                  <td className="py-3">Handling & Miscellaneous Charges</td>
                  <td className="py-3 text-right">{fmtINR(previewingQuote.tax_breakdown.other_charges)}</td>
                </tr>
              )}
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

          {previewingQuote.tax_breakdown?.finance?.include_loan && (
            <div className="mt-8 pt-6 border-t-2 border-slate-900">
              <h3 className="text-sm uppercase tracking-wider font-bold text-slate-900 mb-4">Integrated Loan & Finance Plan</h3>
              <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex justify-between border-b border-slate-200 pb-1.5 col-span-2">
                  <span className="text-slate-500">Finance Provider & Plan</span>
                  <span className="font-semibold text-slate-800">
                    {previewingQuote.tax_breakdown.finance.provider_id ? (
                      financePlans.find(p => p.id === previewingQuote.tax_breakdown.finance.plan_id)?.finance_providers?.name
                    ) : 'Partner Bank'} — {financePlans.find(p => p.id === previewingQuote.tax_breakdown.finance.plan_id)?.name || 'Custom Plan'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Interest Rate (%)</span>
                  <span className="font-bold text-slate-800">{previewingQuote.tax_breakdown.finance.interest_rate}% p.a.</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Loan Tenure</span>
                  <span className="font-semibold text-slate-800">{previewingQuote.tax_breakdown.finance.tenure_months} Months</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Down Payment Amount</span>
                  <span className="font-bold text-slate-800">{fmtINR(previewingQuote.tax_breakdown.finance.down_payment)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Net Loan Principal</span>
                  <span className="font-bold text-slate-800">{fmtINR(previewingQuote.tax_breakdown.finance.total_payable - previewingQuote.tax_breakdown.finance.total_interest - previewingQuote.tax_breakdown.finance.processing_fee)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Processing Fee</span>
                  <span className="font-semibold text-slate-800">{fmtINR(previewingQuote.tax_breakdown.finance.processing_fee)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Total Interest Payable</span>
                  <span className="font-bold text-rose-600">{fmtINR(previewingQuote.tax_breakdown.finance.total_interest)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5 col-span-2">
                  <span className="text-slate-500 font-bold">Estimated Monthly EMI</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-base">{fmtINR(previewingQuote.tax_breakdown.finance.monthly_emi)} / Month</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-12 text-center text-xs text-slate-400 border-t border-slate-100">
            This is a computer generated quote document valid for 15 days from date of printing.
          </div>
        </div>
      )}

      {/* Redesigned Tab Switcher to Standard Underline Design with Horizontal Hidden Scroll */}
      <div className="border-b border-slate-200 w-full relative">
        <nav className="flex -mb-px space-x-6 sm:space-x-8 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('new')
              setPanelOpen(true)
            }}
            className={`
              border-b-2 py-4 px-1 text-sm font-medium transition-all cursor-pointer whitespace-nowrap
              ${activeTab === 'new'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }
            `}
          >
            New Quotation
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('list')
              setPanelOpen(false)
            }}
            className={`
              border-b-2 py-4 px-1 text-sm font-medium transition-all cursor-pointer whitespace-nowrap
              ${activeTab === 'list'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }
            `}
          >
            Created Quotations
          </button>
        </nav>
      </div>

      {/* Tab 1: New Quotation Builder Panel */}
      {activeTab === 'new' && panelOpen && (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-5 md:p-6 space-y-4">

          <div className="space-y-6">
            
            {/* Step 1: Customer Profile (Existing Customer Selector Removed) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <label className="text-sm font-semibold text-slate-900 pl-2">Step 1: Customer Profile</label>
              </div>

              {customerMode === 'new' && (
                <div className="space-y-4 py-2">
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
                        onChange={e => {
                          const cleaned = e.target.value.replace(/\D/g, '')
                          if (cleaned.length <= 10) {
                            setNewCustPhone(cleaned)
                          }
                        }}
                        placeholder="e.g. 9999988888"
                        maxLength={10}
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                      />
                      {newCustPhone && newCustPhone.length !== 10 && (
                        <p className="text-rose-500 text-xs pl-4 mt-1 font-semibold animate-fade-in">
                          Mobile number must be exactly 10 digits.
                        </p>
                      )}
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

                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 pl-4 font-medium">Address / Location</label>
                    <input
                      type="text"
                      value={newCustAddress}
                      onChange={e => setNewCustAddress(e.target.value)}
                      placeholder="e.g. 123 Main St, City, State"
                      className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                    />
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
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="border-b border-slate-100 pb-2">
                <label className="text-sm font-semibold text-slate-900 pl-2">Step 2: Vehicle Model & Variant</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 pl-4">Vehicle Model</label>
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
                  <label className="text-xs text-slate-500 pl-4">Model Variant Price</label>
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
            </div>

            {activeVariant && (
              <div className="space-y-4 py-2">
                <div className="flex flex-col sm:flex-row gap-5 items-center">
                  {activeVariant.image_url ? (
                    <img
                      src={activeVariant.image_url}
                      alt={activeVariant.name}
                      className="w-32 h-20 rounded-2xl object-contain shrink-0 border border-slate-200 shadow-sm bg-white"
                    />
                  ) : (
                    <div className="w-32 h-20 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                      <Car size={24} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                    <h5 className="font-bold text-slate-950 text-base">{activeVariant.name}</h5>
                    <p className="text-xs text-slate-500 font-semibold">
                      Ex-Showroom Price: <span className="text-slate-950 font-bold">{fmtINR(activeVariant.price)}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-[1.5rem] border border-slate-200/80">
                  {/* Fuel Choice */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 pl-2">Select Fuel Type *</label>
                    {(() => {
                      const availableFuels = allFuels.filter(f => activeVariant?.fuel_type_ids?.includes(f.id))
                      if (availableFuels.length === 0) {
                        return <p className="text-xs text-slate-400 italic pl-2">No fuel types defined</p>
                      }
                      return (
                        <div className="flex flex-wrap gap-2 pt-1 pl-1">
                          {availableFuels.map(f => {
                            const isSelected = bFuelId === f.id
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setBFuelId(f.id)}
                                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                ⛽ {f.name}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Transmission Choice */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 pl-2">Select Transmission Type *</label>
                    {(() => {
                      const availableTrans = allTrans.filter(t => activeVariant?.transmission_type_ids?.includes(t.id))
                      if (availableTrans.length === 0) {
                        return <p className="text-xs text-slate-400 italic pl-2">No transmission types defined</p>
                      }
                      return (
                        <div className="flex flex-wrap gap-2 pt-1 pl-1">
                          {availableTrans.map(t => {
                            const isSelected = bTransId === t.id
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setBTransId(t.id)}
                                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                ⚙️ {t.name}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Optional Accessories */}
            {accessories.length > 0 && bVariantId && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="border-b border-slate-100 pb-2">
                  <label className="text-sm font-semibold text-slate-900 pl-2">Step 3: Optional Value-Added Accessories</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-2">
                  {accessories.map(acc => {
                    const isChecked = selectedAccIds.includes(acc.id)
                    return (
                      <label key={acc.id} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAccessoryToggle(acc.id)}
                          className="w-5 h-5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 transition-all shrink-0"
                        />
                        {acc.image_url ? (
                          <img
                            src={acc.image_url}
                            alt={acc.name}
                            className="w-8 h-8 rounded-lg object-contain border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-400 shrink-0">
                            <Wrench size={14} />
                          </div>
                        )}
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
                <div className="border-b border-slate-100 pb-2">
                  <label className="text-sm font-semibold text-slate-900 pl-2">Step 4: Pricing Breakdown, Discount & Valuations</label>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Pricing Breakdown Card */}
                  <div className="lg:col-span-7 space-y-3 text-sm text-slate-700">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 mb-2">Quotation Pricing Breakdown</h4>
                    
                    <div className="flex justify-between pl-2">
                      <span>Ex-Showroom Base Price</span>
                      <span className="font-medium text-slate-900">{fmtINR(exShowroom)}</span>
                    </div>

                    <div className="flex justify-between items-center pl-2 text-xs text-slate-505">
                      <span>GST (CGST + SGST)</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          step={0.1}
                          value={customGstPct !== null ? customGstPct : ''}
                          onChange={e => setCustomGstPct(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(cgstRate + sgstRate)}
                          className="w-16 text-right rounded-lg py-1 px-2 bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">%</span>
                        <span className="text-[10px] text-slate-400 font-semibold w-24 text-right">({fmtINR(gstTax)})</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pl-2 text-xs text-slate-505">
                      <span>TCS (Tax Collected at Source)</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          step={0.1}
                          value={customTcsPct !== null ? customTcsPct : ''}
                          onChange={e => setCustomTcsPct(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(tcsRateSetting)}
                          className="w-16 text-right rounded-lg py-1 px-2 bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">%</span>
                        <span className="text-[10px] text-slate-400 font-semibold w-24 text-right">({fmtINR(tcsTax)})</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pl-2 text-xs text-slate-505">
                      <span>Road Tax & State Surcharges</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          step={0.1}
                          value={customRoadTaxPct !== null ? customRoadTaxPct : ''}
                          onChange={e => setCustomRoadTaxPct(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(roadTaxRate)}
                          className="w-16 text-right rounded-lg py-1 px-2 bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">%</span>
                        <span className="text-[10px] text-slate-400 font-semibold w-24 text-right">({fmtINR(roadTax)})</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pl-2 text-xs text-slate-505">
                      <span>RTO & Registration Fees</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">₹</span>
                        <input
                          type="number"
                          value={customRtoFeePct !== null ? customRtoFeePct : ''}
                          onChange={e => setCustomRtoFeePct(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(rtoFeeRate)}
                          className="w-24 text-right rounded-lg py-1 px-2 bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pl-2 text-xs text-slate-505">
                      <span>Comprehensive Motor Insurance</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          step={0.1}
                          value={customInsurancePct !== null ? customInsurancePct : ''}
                          onChange={e => setCustomInsurancePct(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={String(insuranceRate)}
                          className="w-16 text-right rounded-lg py-1 px-2 bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">%</span>
                        <span className="text-[10px] text-slate-400 font-semibold w-24 text-right">({fmtINR(insuranceTax)})</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pl-2 text-xs text-slate-505">
                      <span>Other Handling & Miscellaneous Charges</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">₹</span>
                        <input
                          type="number"
                          value={customOtherCharges || ''}
                          onChange={e => setCustomOtherCharges(Number(e.target.value))}
                          placeholder="e.g. 15000"
                          className="w-24 text-right rounded-lg py-1 px-2 bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:border-slate-900 outline-none transition-all"
                        />
                      </div>
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
                  <div className="lg:col-span-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 mb-2">Discount & Valuations</h4>
                    
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
                        {/* Likely Purchase Type */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Likely Purchase Type</label>
                      <select
                        value={likelyPurchase}
                        onChange={e => setLikelyPurchase(e.target.value as any)}
                        className="w-full rounded-full py-3 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-slate-900 focus:bg-white outline-none appearance-none"
                      >
                        <option value="first_time">First Time Purchase</option>
                        <option value="additional">Additional Purchase</option>
                        <option value="replacement">Replacement / Exchange</option>
                      </select>
                    </div>

                    {/* Trade-In Exchange Vehicle Sub-Form */}
                    {hasExchange && (
                      <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between pl-2">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            🚗 Trade-In Exchange Vehicle Details
                          </label>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-200/60 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Make / Brand</label>
                                <input
                                  type="text"
                                  value={exchangeMake}
                                  onChange={e => setExchangeMake(e.target.value)}
                                  placeholder="Maruti Suzuki, Honda"
                                  className="w-full rounded-full py-2 px-3.5 bg-white border border-slate-200 outline-none text-slate-800 focus:border-slate-955 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Model</label>
                                <input
                                  type="text"
                                  value={exchangeModel}
                                  onChange={e => setExchangeModel(e.target.value)}
                                  placeholder="Swift, City"
                                  className="w-full rounded-full py-2 px-3.5 bg-white border border-slate-200 outline-none text-slate-800 focus:border-slate-955 text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Mfg Year</label>
                                <input
                                  type="number"
                                  value={exchangeYear}
                                  onChange={e => setExchangeYear(e.target.value)}
                                  placeholder="e.g. 2018"
                                  className="w-full rounded-full py-2 px-3.5 bg-white border border-slate-200 outline-none text-slate-800 focus:border-slate-955 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 pl-2 font-bold uppercase">KMs Driven</label>
                                <input
                                  type="number"
                                  value={exchangeKms}
                                  onChange={e => setExchangeKms(e.target.value)}
                                  placeholder="e.g. 50000"
                                  className="w-full rounded-full py-2 px-3.5 bg-white border border-slate-200 outline-none text-slate-800 focus:border-slate-955 text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Condition</label>
                                <select
                                  value={exchangeCondition}
                                  onChange={e => setExchangeCondition(e.target.value)}
                                  className="w-full rounded-full py-2 px-3 bg-white border border-slate-200 outline-none text-slate-850 focus:border-slate-955 text-xs"
                                >
                                  <option value="excellent">Excellent</option>
                                  <option value="good">Good</option>
                                  <option value="fair">Fair</option>
                                  <option value="poor">Poor</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Valuation (INR)</label>
                                <input
                                  type="number"
                                  value={exchangeValuation}
                                  onChange={e => setExchangeValuation(e.target.value)}
                                  placeholder="e.g. 250000"
                                  className="w-full rounded-full py-2 px-3.5 bg-white border border-slate-200 outline-none text-slate-800 focus:border-slate-955 text-xs font-bold"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Appraisal Notes</label>
                              <textarea
                                value={exchangeNotes}
                                onChange={e => setExchangeNotes(e.target.value)}
                                placeholder="Structural or paint remarks..."
                                rows={2}
                                className="w-full rounded-2xl py-2 px-3 bg-white border border-slate-200 outline-none text-slate-850 text-xs resize-none"
                              />
                            </div>
                          </div>

                          {/* Conditional Exchange Documents */}
                          <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-200/60 text-xs">
                            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider pl-2">
                              Required Exchange Documents & Photos
                            </p>
                            
                            <div className="space-y-2 pl-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Photos (At least 4 required) *</label>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {exchangeImages.map((imgUrl, idx) => (
                                  <div key={idx} className="relative inline-block w-16 h-16">
                                    <img
                                      src={imgUrl}
                                      alt={`Vehicle ${idx + 1}`}
                                      className="w-16 h-16 rounded-xl object-contain border border-slate-200"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setExchangeImages(prev => prev.filter((_, i) => i !== idx))}
                                      className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 hover:bg-slate-700 transition-colors"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ))}
                                {exchangeImages.length < 6 && (
                                  <div className="w-16 h-16">
                                    <ImageUpload
                                      value={null}
                                      folder="exchange"
                                      onChange={(url) => {
                                        if (url) {
                                          setExchangeImages(prev => [...prev, url])
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-500 mt-1">
                                Uploaded: {exchangeImages.length} {exchangeImages.length < 4 ? `(need ${4 - exchangeImages.length} more)` : '(Met)'}
                              </p>
                            </div>

                            <div className="space-y-2 pt-1">
                              <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 pl-2 font-bold uppercase">RC Copy (Registration Certificate) *</div>
                                <ImageUpload
                                  value={exchangeRcCopy}
                                  folder="exchange"
                                  onChange={setExchangeRcCopy}
                                  accept="image/*,application/pdf"
                                  label=""
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Insurance Copy *</div>
                                <ImageUpload
                                  value={exchangeInsurance}
                                  folder="exchange"
                                  onChange={setExchangeInsurance}
                                  accept="image/*,application/pdf"
                                  label=""
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 pl-2 font-bold uppercase">NOC (No Objection Certificate) *</div>
                                <ImageUpload
                                  value={exchangeNoc}
                                  folder="exchange"
                                  onChange={setExchangeNoc}
                                  accept="image/*,application/pdf"
                                  label=""
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-900 text-white rounded-[2rem] p-5 text-center space-y-1.5">
                      <p className="text-xs text-slate-400">Final Net On-Road Price</p>
                      <p className="text-2xl font-bold text-white">{fmtINR(finalOnRoadPrice)}</p>
                      {exchangeValue > 0 && (
                        <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                          (Net of {fmtINR(exchangeValue)} Trade-In)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 5: Integrated Finance & Loan Planner */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="border-b border-slate-100 pb-2">
                    <label className="text-sm font-semibold text-slate-900 pl-2">Step 5: Integrated Finance & Loan Planner</label>
                  </div>

                  {/* Mode of Purchase */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 pl-4 font-medium">Mode of Purchase</label>
                    <select
                      value={modeOfPurchase}
                      onChange={e => setModeOfPurchase(e.target.value as any)}
                      className="w-full rounded-full py-3.5 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-slate-900 focus:bg-white outline-none appearance-none"
                    >
                      <option value="cash">Cash Payment</option>
                      <option value="loan">Finance / Loan</option>
                      <option value="other">Other Payment Mode</option>
                    </select>
                  </div>

                  {/* Conditional Other Payment Mode details */}
                  {modeOfPurchase === 'other' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-xs text-slate-500 pl-4 font-medium">Specify Other Purchase Mode Details *</label>
                      <input
                        type="text"
                        value={modeOfPurchaseOtherText}
                        onChange={e => setModeOfPurchaseOtherText(e.target.value)}
                        placeholder="e.g. Demand Draft, Corporate Sponsorship, etc."
                        className="w-full rounded-full py-3.5 px-6 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 outline-none text-sm"
                      />
                    </div>
                  )}

                  {/* Conditional: Mode of Purchase === 'loan' - Aadhar and PAN uploads */}
                  {modeOfPurchase === 'loan' && (
                    <div className="space-y-4 pt-2">
                      <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/60 space-y-4">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider pl-2">
                          Required Finance Documents (Aadhar & PAN Cards)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <div className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Aadhar Card Front *</div>
                            <ImageUpload
                              value={loanAadharFront}
                              folder="documents"
                              onChange={setLoanAadharFront}
                              accept="image/*,application/pdf"
                              label=""
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="text-[10px] text-slate-500 pl-2 font-bold uppercase">Aadhar Card Back *</div>
                            <ImageUpload
                              value={loanAadharBack}
                              folder="documents"
                              onChange={setLoanAadharBack}
                              accept="image/*,application/pdf"
                              label=""
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="text-[10px] text-slate-500 pl-2 font-bold uppercase">PAN Card Front *</div>
                            <ImageUpload
                              value={loanPanFront}
                              folder="documents"
                              onChange={setLoanPanFront}
                              accept="image/*,application/pdf"
                              label=""
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="text-[10px] text-slate-500 pl-2 font-bold uppercase">PAN Card Back *</div>
                            <ImageUpload
                              value={loanPanBack}
                              folder="documents"
                              onChange={setLoanPanBack}
                              accept="image/*,application/pdf"
                              label=""
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {includeLoan && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left: Tuner */}
                      <div className="lg:col-span-7 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                          {/* Custom Interest Rate input */}
                          <div className="space-y-2">
                            <label className="text-xs text-slate-500 pl-4 font-medium">Interest Rate (%)</label>
                            <input
                              type="number"
                              step={0.01}
                              value={customInterestRate !== null ? customInterestRate : ''}
                              onChange={e => setCustomInterestRate(e.target.value === '' ? null : Number(e.target.value))}
                              placeholder={activePlan ? String(activePlan.interest_rate) : '0'}
                              className="w-full rounded-full py-3.5 px-5 bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-slate-900 focus:bg-white outline-none"
                            />
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
                        <div className="py-3 flex items-start gap-3 text-xs leading-relaxed text-slate-600">
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
                      <div className="lg:col-span-5 space-y-4 p-2">
                        <div>
                          <span className="text-xs text-slate-450">Monthly Outgoing Payment</span>
                          <h3 className="text-2xl font-light tracking-tight text-slate-950 mt-0.5">{fmtINR(loanMetrics.monthlyEMI)}/mo</h3>
                          <p className="text-[10px] text-slate-400">
                            Interest applied: {interestRate}% per annum
                          </p>
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-700">
                          <div className="flex justify-between">
                            <span className="text-slate-450">Net Loan Principal</span>
                            <span className="font-semibold text-slate-900">{fmtINR(loanMetrics.loanAmount)}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-450">Processing Fee ({activePlan?.processing_fee_percent || 0}%)</span>
                            <span className="font-semibold text-slate-900">{fmtINR(loanMetrics.processingFee)}</span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-450">Total Interest Payable</span>
                            <span className="font-semibold text-slate-900">{fmtINR(loanMetrics.totalInterest)}</span>
                          </div>

                          <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-bold text-slate-950">
                            <span>Overall Loan Cost</span>
                            <span className="text-base text-slate-950">{fmtINR(loanMetrics.totalPayable)}</span>
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

            {/* Step 6: Schedule Follow-Up Option */}
            <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-200 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={scheduleFollowUp}
                  onChange={e => setScheduleFollowUp(e.target.checked)}
                  className="w-5 h-5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 transition-all shrink-0"
                />
                <span className="text-sm font-semibold text-slate-900 select-none">
                  📅 Schedule a follow-up for this customer
                </span>
              </label>

              {scheduleFollowUp && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 pl-4 font-medium">Follow-up Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={followUpDueDate}
                      onChange={e => setFollowUpDueDate(e.target.value)}
                      className="w-full rounded-full py-3 px-5 bg-white border border-slate-200 text-slate-900 text-sm focus:border-slate-900 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 pl-4 font-medium">Follow-up Notes / Goal *</label>
                    <input
                      type="text"
                      value={followUpNotes}
                      onChange={e => setFollowUpNotes(e.target.value)}
                      placeholder="e.g. Discuss loan approval status, schedule test drive"
                      className="w-full rounded-full py-3 px-5 bg-white border border-slate-200 text-slate-900 text-sm focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>
              )}
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

      {/* Tab 2: Created Quotations List */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Relocated Stats Cards below Tabs */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex items-center justify-between">
                <div className="space-y-1 pl-2">
                  <p className="text-xs text-slate-500 font-medium">My Total Quotes</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900">{quotes.length}</p>
                </div>
                <div className="bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-slate-500" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[1.5rem] p-4 flex items-center justify-between">
                <div className="space-y-1 pl-2">
                  <p className="text-xs text-slate-500 font-medium">Pending Approvals</p>
                  <p className="text-xl font-bold tracking-tight text-slate-900">{pendingApprovalsCount}</p>
                </div>
                <div className="bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle size={16} className="text-slate-500" />
                </div>
              </div>
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
          </div>

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
      )}
    </div>
  )
}
