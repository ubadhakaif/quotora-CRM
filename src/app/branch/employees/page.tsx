'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Search, Users, Activity, FileText } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Reset page parameter on search query change
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

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
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-500">
          No employees found.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-5 px-6 md:px-8">Employee</th>
                  <th className="py-5 px-6">Quotations (7d)</th>
                  <th className="py-5 px-6">Leads (7d)</th>
                  <th className="py-5 px-6">Role</th>
                  <th className="py-5 px-6 md:pr-8 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Employee Info */}
                    <td className="py-5 px-6 md:px-8 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{emp.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Quotations Created (7d) */}
                    <td className="py-5 px-6 min-w-[120px] text-slate-700">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <FileText size={14} className="text-slate-400 shrink-0" />
                        <span>{emp.quotations_count || 0}</span>
                      </div>
                    </td>

                    {/* Leads Assigned (7d) */}
                    <td className="py-5 px-6 min-w-[120px] text-slate-700">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Users size={14} className="text-slate-400 shrink-0" />
                        <span>{emp.leads_count || 0}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-5 px-6 min-w-[130px]">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                        {emp.role || 'employee'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-5 px-6 md:pr-8 text-right min-w-[120px]">
                      <span className={`inline-block text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${emp.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
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
