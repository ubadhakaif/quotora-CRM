'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Search, PhoneCall, CheckSquare, Clock, AlertTriangle } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'

interface FollowUp {
  id: string
  created_at: string
  scheduled_at: string
  status: string
  notes: string | null
  customer_id: string
  assigned_to: string
  customers?: { name: string; phone: string } | null
  profiles?: { name: string } | null
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200'
}

export default function BranchFollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('pending') // pending, overdue, completed, all

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page parameter on filter/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter])
  
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      if (!profile?.branch_id) return
      setLoading(true)
      
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*, customers(name, phone), profiles!follow_ups_assigned_to_fkey(name)')
        .eq('branch_id', profile.branch_id)
        .order('scheduled_at', { ascending: true })

      if (data) setFollowUps(data as any)
      setLoading(false)
    }
    fetchData()
  }, [profile])

  const now = new Date()

  const filtered = followUps.filter(f => {
    const custName = f.customers?.name || ''
    const matchSearch = custName.toLowerCase().includes(search.toLowerCase())
    
    let matchFilter = true
    const schedDate = new Date(f.scheduled_at)
    
    if (filter === 'pending') {
      matchFilter = f.status === 'pending' && schedDate >= now
    } else if (filter === 'overdue') {
      matchFilter = f.status === 'pending' && schedDate < now
    } else if (filter === 'completed') {
      matchFilter = f.status === 'completed'
    } else {
      matchFilter = true
    }

    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer name..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
        
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none cursor-pointer"
        >
          <option value="all">All Follow-ups</option>
          <option value="pending">Upcoming Pending</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-[2rem]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No follow-ups found matching criteria.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Customer</th>
                  <th className="py-5 px-6">Scheduled Time</th>
                  <th className="py-5 px-6">Status</th>
                  <th className="py-5 px-6">Assigned Executive</th>
                  <th className="py-5 px-6 md:pr-8">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(f => {
                  const schedDate = new Date(f.scheduled_at)
                  const isOverdue = f.status === 'pending' && schedDate < now
                  const custName = f.customers?.name || 'Unknown'
                  const custPhone = f.customers?.phone || 'No phone'
                  const execName = f.profiles?.name || 'Unknown'
                  const notesText = f.notes || '—'

                  return (
                    <tr key={f.id} className={`hover:bg-slate-50/50 transition-colors ${isOverdue ? 'bg-rose-50/20 hover:bg-rose-50/30' : ''}`}>
                      {/* Customer */}
                      <td className="py-5 px-6 md:px-8 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-semibold ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            {custName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{custName}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{custPhone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-5 px-6 min-w-[180px] text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>
                            {schedDate.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })} at {schedDate.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-5 px-6 min-w-[150px]">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${statusColors[f.status] || ''}`}>
                            {f.status}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Assigned Executive */}
                      <td className="py-5 px-6 min-w-[160px] text-slate-700 font-semibold">
                        {execName}
                      </td>

                      {/* Notes */}
                      <td className="py-5 px-6 md:pr-8 min-w-[200px] text-slate-500 font-medium max-w-xs truncate" title={notesText}>
                        {notesText}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
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
