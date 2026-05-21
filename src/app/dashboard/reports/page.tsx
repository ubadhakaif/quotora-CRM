'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, TrendingUp, Users, Car } from 'lucide-react'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Placeholder for fetching report data
    setLoading(false)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-medium text-slate-900">Analytics & Reports</h2>
        <select className="rounded-full py-3 px-6 bg-white border border-slate-200 text-slate-900 focus:border-slate-900 transition-all outline-none appearance-none">
          <option value="this_month">This Month</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Performance */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg text-slate-900 font-medium">Branch Performance</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">No data available for the selected period.</p>
          </div>
        </div>

        {/* Sales Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
              <Users size={20} />
            </div>
            <h3 className="text-lg text-slate-900 font-medium">Top Sales Executives</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">No data available for the selected period.</p>
          </div>
        </div>

        {/* Top Vehicles */}
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
              <Car size={20} />
            </div>
            <h3 className="text-lg text-slate-900 font-medium">Top Selling Vehicles</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">No data available for the selected period.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
