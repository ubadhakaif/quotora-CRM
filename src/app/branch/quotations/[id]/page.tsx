'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { 
  ArrowLeft, User, Mail, Phone, MapPin, Car, Wrench, FileText, 
  ExternalLink, Calendar, Building2, Landmark, RefreshCw, HelpCircle,
  FileCheck
} from 'lucide-react'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

interface Variant {
  id: string
  name: string
  price: number
  models: {
    name: string
  } | null
}

interface Profile {
  id: string
  name: string
}

interface ExchangeVehicle {
  id: string
  make: string
  model: string
  year: number | null
  kms_driven: number | null
  condition: string
  estimated_value: number
  notes: string | null
}

interface Quotation {
  id: string
  created_at: string
  status: string
  approval_status: string
  total_price: number
  discount_amount: number
  discount_percent: number
  notes: string | null
  likely_purchase: string | null
  exchange_rc_copy: string | null
  exchange_insurance: string | null
  exchange_noc: string | null
  exchange_images: string[]
  mode_of_purchase: string | null
  mode_of_purchase_other: string | null
  loan_aadhar_front: string | null
  loan_aadhar_back: string | null
  loan_pan_front: string | null
  loan_pan_back: string | null
  latitude: number | null
  longitude: number | null
  tax_breakdown: any
  customers: Customer | null
  variants: Variant | null
  profiles: Profile | null
  approved_profiles?: { name: string } | null
  selected_fuel?: { name: string } | null
  selected_trans?: { name: string } | null
}

interface QuotationAccessory {
  id: string
  price: number
  accessories: {
    name: string
    image_url: string | null
    price: number
  } | null
}

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)

const purchaseLabels: Record<string, string> = {
  first_time: 'First-time Purchase 🚗',
  additional: 'Additional Vehicle 🚘',
  replacement: 'Replacement / Exchange 🔄',
}

const modeLabels: Record<string, string> = {
  cash: 'Self-Funded / Cash 💵',
  loan: 'Finance / Loan 🏛️',
  other: 'Other Method 💳',
}

export default function BranchQuotationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const supabase = createClient()
  const id = params?.id as string

  const [quote, setQuote] = useState<Quotation | null>(null)
  const [accessories, setAccessories] = useState<QuotationAccessory[]>([])
  const [exchange, setExchange] = useState<ExchangeVehicle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchDetails = async () => {
      setLoading(true)
      try {
        // Fetch main quotation record
        const { data: qData, error: qError } = await supabase
          .from('quotations')
          .select(`
            *,
            customers (*),
            variants (id, name, price, models(name)),
            profiles!quotations_created_by_fkey (id, name),
            selected_fuel:fuel_types(name),
            selected_trans:transmission_types(name)
          `)
          .eq('id', id)
          .eq('is_active', true)
          .single()

        if (qError) throw qError
        setQuote(qData as any)

        // Fetch selected accessories
        const { data: accData } = await supabase
          .from('quotation_accessories')
          .select('*, accessories(*)')
          .eq('quotation_id', id)

        if (accData) {
          setAccessories(accData as any[])
        }

        // Fetch exchange vehicle if applicable
        const { data: exData } = await supabase
          .from('exchange_vehicles')
          .select('*')
          .eq('quotation_id', id)
          .single()

        if (exData) {
          setExchange(exData as any)
        }
      } catch (err: any) {
        addToast(err.message || 'Failed to fetch quotation details', 'error')
        router.push('/branch/quotations')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [id, supabase, router, addToast])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[3px] border-slate-100 border-t-slate-900 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Fetching details...</p>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-20 text-slate-500">
        Quotation details not found.
      </div>
    )
  }

  const tax = quote.tax_breakdown || {}
  const hasFinance = tax.finance && tax.finance.include_loan

  // File Preview Card Component
  const FilePreview = ({ url, label }: { url: string | null; label: string }) => {
    if (!url) return null
    const isPdf = url.toLowerCase().includes('.pdf')
    const isImage = !isPdf && (url.match(/\.(jpeg|jpg|gif|png|webp)/i) !== null || url.includes('publicUrl') || url.startsWith('http'))
    
    return (
      <div className="bg-white border border-slate-200 rounded-[2rem] p-4 flex flex-col items-stretch space-y-3 justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-50 text-slate-700">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{label}</p>
            <p className="text-[10px] text-slate-500">Document Uploaded</p>
          </div>
        </div>

        {isImage && (
          <div className="w-full h-28 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 relative group">
            <img 
              src={url} 
              alt={label} 
              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
            />
          </div>
        )}

        {isPdf && (
          <div className="w-full h-28 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-slate-500">
            <FileText size={32} className="text-slate-400 mb-1" />
            <span className="text-[11px] font-semibold text-slate-600">PDF Document</span>
          </div>
        )}

        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white rounded-full py-2.5 text-xs font-medium hover:bg-slate-800 transition-colors"
        >
          View Full <ExternalLink size={12} />
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32">
      {/* Dynamic Back Link - Hidden on Mobile */}
      <div className="hidden md:block">
        <Link 
          href="/branch/quotations" 
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Branch Quotations
        </Link>
      </div>

      {/* Hero Header Block */}
      <div className="bg-white border border-slate-200 rounded-[3rem] p-6 md:p-10 space-y-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Quotation Details</span>
            <StatusBadge status={quote.status} type="quotation" />
            {quote.approval_status && quote.approval_status !== 'none' && (
              <StatusBadge status={`Approval ${quote.approval_status}`} type="approval" />
            )}
          </div>
          <h2 className="text-3xl text-slate-900 leading-tight">
            {quote.customers?.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              {new Date(quote.created_at).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              Created by {quote.profiles?.name || 'Sales Executive'}
            </span>
            {quote.latitude && quote.longitude && (
              <>
                <span className="text-slate-300">•</span>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${quote.latitude},${quote.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline"
                  title="View Submission Location"
                >
                  <MapPin size={13} className="text-rose-500" />
                  GPS: {Number(quote.latitude).toFixed(4)}, {Number(quote.longitude).toFixed(4)}
                </a>
              </>
            )}
          </div>
        </div>

        <div className="text-left md:text-right shrink-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final On-Road Price</p>
          <p className="text-4xl text-slate-900 leading-none mt-1 font-semibold">{formatINR(quote.total_price)}</p>
          {Number(quote.discount_amount) > 0 && (
            <p className="text-xs text-emerald-600 font-medium mt-1">
              Includes {formatINR(quote.discount_amount)} ({quote.discount_percent}%) Discount
            </p>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: General metadata, specs & finance */}
        <div className="lg:col-span-7 space-y-8">
          {/* Customer Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
            <h3 className="text-lg text-slate-900 flex items-center gap-2">
              <User size={18} className="text-slate-400" /> Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Customer Name</span>
                <span className="text-slate-900 font-medium">{quote.customers?.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Mobile Number</span>
                <span className="text-slate-900 font-medium flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" />
                  {quote.customers?.phone || '—'}
                </span>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Email Address</span>
                <span className="text-slate-900 font-medium flex items-center gap-1">
                  <Mail size={13} className="text-slate-400" />
                  {quote.customers?.email || '—'}
                </span>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Registered Address</span>
                <span className="text-slate-900 leading-relaxed font-medium block bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  {quote.customers?.address || 'No residential address supplied.'}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Specifications Card */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
            <h3 className="text-lg text-slate-900 flex items-center gap-2">
              <Car size={18} className="text-slate-400" /> Selected Vehicle Specifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Model / Series</span>
                <span className="text-slate-900 font-medium">{quote.variants?.models?.name || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Variant Name</span>
                <span className="text-slate-900 font-medium">{quote.variants?.name || '—'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Ex-Showroom Price</span>
                <span className="text-slate-900 font-semibold">{formatINR(quote.variants?.price || 0)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Purchase Intent Type</span>
                <span className="text-slate-900 font-medium">
                  {quote.likely_purchase ? purchaseLabels[quote.likely_purchase] || quote.likely_purchase : '—'}
                </span>
              </div>
              {quote.selected_fuel?.name && (
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Fuel Type Option</span>
                  <span className="text-slate-900 font-medium flex items-center gap-1">
                    ⛽ {quote.selected_fuel.name}
                  </span>
                </div>
              )}
              {quote.selected_trans?.name && (
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Transmission Option</span>
                  <span className="text-slate-900 font-medium flex items-center gap-1">
                    ⚙️ {quote.selected_trans.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Trade-In Exchange Vehicle Details (If exists) */}
          {exchange && (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
              <h3 className="text-lg text-slate-900 flex items-center gap-2">
                <RefreshCw size={18} className="text-slate-400" /> Trade-In Exchange Vehicle
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Vehicle Make & Model</span>
                  <span className="text-slate-900 font-medium">{exchange.make} {exchange.model}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Year of Manufacture</span>
                  <span className="text-slate-900 font-medium">{exchange.year || '—'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Kilometers Driven</span>
                  <span className="text-slate-900 font-medium">
                    {exchange.kms_driven ? `${exchange.kms_driven.toLocaleString('en-IN')} km` : '—'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Assessed Condition</span>
                  <span className="text-slate-900 capitalize font-medium">{exchange.condition}</span>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Appraisal Value (Offset)</span>
                  <span className="text-slate-900 font-bold text-emerald-600">
                    - {formatINR(exchange.estimated_value)}
                  </span>
                </div>
                {exchange.notes && (
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Assessor Evaluation Notes</span>
                    <p className="text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100 italic">
                      "{exchange.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Method & Finance Details */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
            <h3 className="text-lg text-slate-900 flex items-center gap-2">
              <Landmark size={18} className="text-slate-400" /> Mode of Purchase & Finance Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Payment Mode</span>
                <span className="text-slate-900 font-semibold">
                  {quote.mode_of_purchase ? modeLabels[quote.mode_of_purchase] || quote.mode_of_purchase : '—'}
                </span>
              </div>
              {quote.mode_of_purchase === 'other' && quote.mode_of_purchase_other && (
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Details of Other Method</span>
                  <span className="text-slate-900 font-medium">{quote.mode_of_purchase_other}</span>
                </div>
              )}

              {/* Display Loan Details if Finance was attached */}
              {hasFinance && (
                <>
                  <div className="sm:col-span-2 border-t border-slate-100 my-2" />
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Finance Interest Rate</span>
                    <span className="text-slate-900 font-semibold">{tax.finance.interest_rate}% p.a.</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Tenure (Months)</span>
                    <span className="text-slate-900 font-semibold">{tax.finance.tenure_months} months</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Down Payment Amount</span>
                    <span className="text-slate-900 font-semibold">{formatINR(tax.finance.down_payment)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Estimated Monthly EMI</span>
                    <span className="text-slate-900 font-bold text-slate-900 bg-slate-50 rounded-lg px-2 py-0.5 border border-slate-100">
                      {formatINR(tax.finance.monthly_emi)} / month
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Total Loan Interest Payable</span>
                    <span className="text-rose-600 font-semibold">{formatINR(tax.finance.total_interest)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Processing Fee</span>
                    <span className="text-slate-900 font-semibold">{formatINR(tax.finance.processing_fee)}</span>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-medium">Total Outflow Over Tenure</span>
                    <span className="text-slate-900 font-semibold">{formatINR(tax.finance.total_payable)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Cost breakdown and accessories */}
        <div className="lg:col-span-5 space-y-8">
          {/* Price & Taxes Breakdown Card */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
            <h3 className="text-lg text-slate-900">Cost Breakdown Summary</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Ex-Showroom Price</span>
                <span className="font-medium text-slate-900">{formatINR(tax.ex_showroom || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>GST (Goods & Services Tax)</span>
                <span className="font-medium text-slate-900">{formatINR(tax.gst || 0)}</span>
              </div>
              {tax.tcs > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>TCS (Tax Collected at Source)</span>
                  <span className="font-medium text-slate-900">{formatINR(tax.tcs || 0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-600">
                <span>Road Tax</span>
                <span className="font-medium text-slate-900">{formatINR(tax.road_tax || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>RTO Registration Fee</span>
                <span className="font-medium text-slate-900">{formatINR(tax.rto_fee || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Comprehensive Insurance</span>
                <span className="font-medium text-slate-900">{formatINR(tax.insurance || 0)}</span>
              </div>
              {tax.other_charges > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Other Miscellaneous Charges</span>
                  <span className="font-medium text-slate-900">{formatINR(tax.other_charges || 0)}</span>
                </div>
              )}
              {accessories.length > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>Selected Accessories ({accessories.length})</span>
                  <span className="font-medium text-slate-900">{formatINR(tax.accessories || 0)}</span>
                </div>
              )}
              {Number(quote.discount_amount) > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-medium">
                  <span>Approved Dealership Discount</span>
                  <span>- {formatINR(quote.discount_amount)}</span>
                </div>
              )}

              {/* Total On-Road Calculation */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-baseline">
                <span className="text-base text-slate-900 font-medium">Total On-Road Cost</span>
                <span className="text-2xl text-slate-900 font-bold">{formatINR(quote.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Selected Accessories Card */}
          {accessories.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
              <h3 className="text-lg text-slate-900 flex items-center gap-2">
                <Wrench size={18} className="text-slate-400" /> Accessories Profile ({accessories.length})
              </h3>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-2 space-y-3">
                {accessories.map((acc, idx) => {
                  const image = acc.accessories?.image_url
                  return (
                    <div key={acc.id} className={`flex items-center justify-between gap-3 text-sm py-2 ${idx > 0 ? 'pt-3' : ''}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        {image ? (
                          <img 
                            src={image} 
                            alt={acc.accessories?.name || 'Accessory'} 
                            className="w-10 h-10 rounded-xl object-cover shrink-0 bg-slate-50 border border-slate-100" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                            <Wrench size={14} />
                          </div>
                        )}
                        <span className="text-slate-800 font-medium truncate">{acc.accessories?.name || '—'}</span>
                      </div>
                      <span className="font-semibold text-slate-900 shrink-0">{formatINR(acc.price)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Internal Notes card */}
          {quote.notes && (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Internal Deal Notes / Special Directives</h3>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100 italic">
                "{quote.notes}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submitted Documents & Attachments Section */}
      <div className="bg-white border border-slate-200 rounded-[3rem] p-8 space-y-6">
        <h3 className="text-lg text-slate-900 flex items-center gap-2">
          <FileCheck size={20} className="text-slate-400" /> Submitted Documents & Customer Attachments
        </h3>

        {/* Categories Section */}
        <div className="space-y-8">
          {/* Trade-In Exchange Documents */}
          {quote.likely_purchase === 'replacement' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">
                Trade-In Vehicle Documentation
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {quote.exchange_rc_copy ? (
                  <FilePreview url={quote.exchange_rc_copy} label="Registration Certificate (RC)" />
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-6 text-center text-slate-400 text-xs flex items-center justify-center">
                    Missing RC Copy
                  </div>
                )}
                {quote.exchange_insurance ? (
                  <FilePreview url={quote.exchange_insurance} label="Insurance Policy Copy" />
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-6 text-center text-slate-400 text-xs flex items-center justify-center">
                    Missing Insurance Copy
                  </div>
                )}
                {quote.exchange_noc ? (
                  <FilePreview url={quote.exchange_noc} label="No Objection Certificate (NOC)" />
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-6 text-center text-slate-400 text-xs flex items-center justify-center">
                    Missing NOC Document
                  </div>
                )}
              </div>

              {/* Trade-In Exchange Images */}
              {quote.exchange_images && quote.exchange_images.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">
                    Vehicle Condition Photos
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {quote.exchange_images.map((imgUrl, index) => (
                      <a 
                        key={index} 
                        href={imgUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative block aspect-square rounded-[1.5rem] bg-slate-50 overflow-hidden border border-slate-200 hover:border-slate-400 transition-all"
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Vehicle Photo ${index + 1}`} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                          Enlarge
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Finance Loan Verification Documents */}
          {quote.mode_of_purchase === 'loan' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">
                Finance Verification Documents
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {quote.loan_aadhar_front ? (
                  <FilePreview url={quote.loan_aadhar_front} label="Aadhar Card (Front)" />
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-6 text-center text-slate-400 text-xs flex items-center justify-center">
                    Missing Aadhar Front
                  </div>
                )}
                {quote.loan_aadhar_back ? (
                  <FilePreview url={quote.loan_aadhar_back} label="Aadhar Card (Back)" />
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-6 text-center text-slate-400 text-xs flex items-center justify-center">
                    Missing Aadhar Back
                  </div>
                )}
                {quote.loan_pan_front ? (
                  <FilePreview url={quote.loan_pan_front} label="PAN Card (Front)" />
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-6 text-center text-slate-400 text-xs flex items-center justify-center">
                    Missing PAN Front
                  </div>
                )}
                {quote.loan_pan_back ? (
                  <FilePreview url={quote.loan_pan_back} label="PAN Card (Back)" />
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-6 text-center text-slate-400 text-xs flex items-center justify-center">
                    Missing PAN Back
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fallback if no attachments are required */}
          {quote.likely_purchase !== 'replacement' && quote.mode_of_purchase !== 'loan' && (
            <div className="text-slate-500 text-xs italic pl-2">
              No files or attachments were required for this purchase configuration (Direct cash option).
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
