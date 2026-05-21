'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Search, Users, Activity, FileText } from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  last_active?: string
  quotations_count?: number
  leads_count?: number
}

export default function BranchEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { profile } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      if (!profile?.branch_id) return
      setLoading(true)

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      // Fetch employees for this branch
      const { data: emps, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('branch_id', profile.branch_id)
        .order('name')

      if (error) {
        setLoading(false)
        return
      }

      // Fetch quotations and leads count for the past week per employee
      const { data: quotes } = await supabase
        .from('quotations')
        .select('created_by, id')
        .gte('created_at', weekAgo.toISOString())
        .eq('branch_id', profile.branch_id)
        
      const { data: leads } = await supabase
        .from('leads')
        .select('assigned_to, id')
        .gte('created_at', weekAgo.toISOString())
        .eq('branch_id', profile.branch_id)

      const enriched = (emps || []).map((emp: any) => {
        const myQuotes = (quotes || []).filter((q: any) => q.created_by === emp.id).length
        const myLeads = (leads || []).filter((l: any) => l.assigned_to === emp.id).length
        return {
          ...emp,
          quotations_count: myQuotes,
          leads_count: myLeads
        }
      })

      setEmployees(enriched)
      setLoading(false)
    }

    if (profile) fetchData()
  }, [profile])

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full rounded-full py-4 pl-14 pr-8 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 transition-all outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-[2rem]" />)}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(emp => (
              <div key={emp.id} className="p-4 md:p-8 px-6 md:px-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 font-medium truncate">{emp.name}</p>
                      {!emp.is_active && (
                        <span className="text-[10px] bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-medium">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">{emp.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 shrink-0 md:border-l md:border-slate-100 md:pl-8">
                  <div className="text-center">
                    <p className="text-2xl font-medium text-slate-900">{emp.quotations_count}</p>
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
                      <FileText size={12} /> Quotes (7d)
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-medium text-slate-900">{emp.leads_count}</p>
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
                      <Users size={12} /> Leads (7d)
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-500">No employees found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
