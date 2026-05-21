'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { TrendingUp, BarChart3, Users, Filter } from 'lucide-react'

export default function BranchAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  
  useEffect(() => {
    // Analytics implementation would fetch actual charts/graphs data here
    if (profile?.branch_id) {
      setLoading(false)
    }
  }, [profile])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-medium text-slate-900">Branch Analytics</h2>
        <select className="rounded-full py-3 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none">
          <option value="this_month">This Month</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="this_quarter">This Quarter</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg text-slate-900 font-medium">Revenue Trend</h3>
          </div>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
            <p className="text-slate-400">Revenue visualization area</p>
          </div>
        </div>

        {/* Funnel Placeholder */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Filter size={20} />
            </div>
            <h3 className="text-lg text-slate-900 font-medium">Sales Funnel</h3>
          </div>
          <div className="space-y-4">
            <div className="h-12 bg-slate-100 rounded-lg flex items-center px-4 w-full"><span className="text-sm font-medium text-slate-700">Total Leads (100%)</span></div>
            <div className="h-12 bg-blue-50 rounded-lg flex items-center px-4 w-4/5"><span className="text-sm font-medium text-blue-700">Quotations Sent (80%)</span></div>
            <div className="h-12 bg-emerald-50 rounded-lg flex items-center px-4 w-2/5"><span className="text-sm font-medium text-emerald-700">Won / Sold (40%)</span></div>
          </div>
        </div>

        {/* Employee Comparison Placeholder */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Users size={20} />
            </div>
            <h3 className="text-lg text-slate-900 font-medium">Employee Performance</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-600">Alice Smith</span>
              <span className="text-sm font-medium text-slate-900">12 Sales</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-600">Bob Jones</span>
              <span className="text-sm font-medium text-slate-900">8 Sales</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-600">Charlie Davis</span>
              <span className="text-sm font-medium text-slate-900">5 Sales</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
