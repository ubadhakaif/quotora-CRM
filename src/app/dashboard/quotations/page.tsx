'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import { Search, FileText, FileCheck, Eye, Landmark } from 'lucide-react'
import Link from 'next/link'
import { Pagination } from '@/components/ui/Pagination'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
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

interface Branch {
  id: string
  name: string
}

interface Quotation {
  id: string
  created_at: string
  status: string
  approval_status: string
  total_price: number
  discount_amount: number
  discount_percent: number
  customers: Customer | null
  variants: Variant | null
  profiles: Profile | null
  branches: Branch | null
}

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

const APPROVAL_STYLES: Record<string, string> = {
  none: 'bg-slate-100 text-slate-700 border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

export default function AdminQuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page to 1 on search filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const { addToast } = useToast()
  const supabase = createClient()

  const fetchQuotations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers(id, name, phone, email),
        variants(id, name, price, models(name)),
        profiles!quotations_created_by_fkey(id, name),
        branches(id, name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      addToast(error.message, 'error')
    } else if (data) {
      setQuotes(data as any[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchQuotations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredQuotes = quotes.filter(q => {
    const custName = q.customers?.name || ''
    const custEmail = q.customers?.email || ''
    const modelName = q.variants?.models?.name || ''
    const variantName = q.variants?.name || ''
    const creatorName = q.profiles?.name || ''
    const branchName = q.branches?.name || ''

    const searchLower = search.toLowerCase()
    return (
      custName.toLowerCase().includes(searchLower) ||
      custEmail.toLowerCase().includes(searchLower) ||
      modelName.toLowerCase().includes(searchLower) ||
      variantName.toLowerCase().includes(searchLower) ||
      creatorName.toLowerCase().includes(searchLower) ||
      branchName.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5">
          <p className="text-xs text-slate-500 font-medium">Total Quotations</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{quotes.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5">
          <p className="text-xs text-amber-600 font-medium">Approval Pending</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {quotes.filter(q => q.approval_status === 'pending').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5">
          <p className="text-xs text-emerald-600 font-medium">Approved / Active</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {quotes.filter(q => q.status === 'approved').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-5">
          <p className="text-xs text-red-600 font-medium">Rejected</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {quotes.filter(q => q.status === 'rejected' || q.approval_status === 'rejected').length}
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex-1">
        <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer name, email, vehicle, executive, or branch..."
          className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
        />
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-[2rem]" />)}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center">
          <FileText className="mx-auto text-slate-300 mb-3" size={42} />
          <p className="text-sm text-slate-500 font-medium">No quotations found matching search criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Customer</th>
                  <th className="py-5 px-6">Vehicle Specification</th>
                  <th className="py-5 px-6">Creator & Branch</th>
                  <th className="py-5 px-6">Total Price</th>
                  <th className="py-5 px-6">Status</th>
                  <th className="py-5 px-6">Created On</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(q => {
                  const customerName = q.customers?.name || 'Unknown'
                  const customerPhone = q.customers?.phone
                  const customerEmail = q.customers?.email
                  const modelName = q.variants?.models?.name || '—'
                  const variantName = q.variants?.name || '—'
                  const creatorName = q.profiles?.name || 'Sales Executive'
                  const branchName = q.branches?.name || '—'

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Customer Info */}
                      <td className="py-5 px-6 md:px-8 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{customerName}</p>
                            {customerPhone && <p className="text-[11px] text-slate-400">{customerPhone}</p>}
                            {customerEmail && <p className="text-[11px] text-slate-400">{customerEmail}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Vehicle Specs */}
                      <td className="py-5 px-6 min-w-[160px]">
                        <p className="font-semibold text-slate-800">{variantName}</p>
                        <span className="text-[11px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 mt-0.5 inline-block font-semibold">
                          {modelName}
                        </span>
                      </td>

                      {/* Creator & Branch */}
                      <td className="py-5 px-6 min-w-[180px]">
                        <p className="font-medium text-slate-800">{creatorName}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{branchName}</p>
                      </td>

                      {/* Total Price & Discount */}
                      <td className="py-5 px-6 min-w-[150px]">
                        <p className="font-semibold text-slate-950">{formatINR(q.total_price)}</p>
                        {Number(q.discount_amount) > 0 && (
                          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                            -{formatINR(q.discount_amount)} ({q.discount_percent}%)
                          </p>
                        )}
                      </td>

                      {/* Status Badges */}
                      <td className="py-5 px-6 min-w-[220px]">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${STATUS_STYLES[q.status] || STATUS_STYLES.draft}`}>
                            Status: {q.status}
                          </span>
                          {q.approval_status && q.approval_status !== 'none' && (
                            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${APPROVAL_STYLES[q.approval_status] || APPROVAL_STYLES.none}`}>
                              Approval: {q.approval_status}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created On */}
                      <td className="py-5 px-6 min-w-[140px] text-slate-600 font-medium">
                        {new Date(q.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Action Links */}
                      <td className="py-5 px-6 md:pr-8 text-right min-w-[120px]">
                        <Link
                          href={`/dashboard/quotations/${q.id}`}
                          className="inline-flex items-center gap-1 bg-slate-900 text-white rounded-full px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye size={12} /> View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredQuotes.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setRowsPerPage(rows)
              setCurrentPage(1)
            }}
          />
        </div>
      )}
    </div>
  )
}
