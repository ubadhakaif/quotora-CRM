'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Search, PhoneCall, CheckSquare, Clock, AlertTriangle } from 'lucide-react'

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
          className="rounded-full py-4 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none"
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
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(f => {
              const schedDate = new Date(f.scheduled_at)
              const isOverdue = f.status === 'pending' && schedDate < now
              
              return (
                <div key={f.id} className={`p-4 md:p-8 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors ${isOverdue ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
                  
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                      {f.status === 'completed' ? <CheckSquare size={20} /> : isOverdue ? <AlertTriangle size={20} /> : <PhoneCall size={20} />}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-900 font-medium truncate">{f.customers?.name}</p>
                        <span className={`text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5 border ${statusColors[f.status] || ''}`}>
                          {f.status}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5 border bg-rose-50 text-rose-700 border-rose-200">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{f.customers?.phone || 'No phone'}</p>
                    </div>
                  </div>

                  <div className="shrink-0 space-y-1 md:text-right md:border-l md:border-slate-100 md:pl-8">
                    <p className="text-sm text-slate-900 font-medium flex items-center md:justify-end gap-1">
                      <Clock size={14} className="text-slate-400" />
                      {schedDate.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      Assigned to: <span className="font-medium text-slate-700">{f.profiles?.name || 'Unknown'}</span>
                    </p>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-500">No follow-ups found matching criteria.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
