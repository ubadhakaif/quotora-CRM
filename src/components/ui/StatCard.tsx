import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: string | number
    isPositive: boolean
  }
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-start justify-between">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-medium tracking-tight text-slate-900">{value}</p>
        {trend && (
          <p className="text-sm">
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
            <span className="text-slate-500 ml-2">vs last month</span>
          </p>
        )}
      </div>
      <div className="bg-slate-50 w-12 h-12 rounded-[1rem] flex items-center justify-center">
        <Icon size={20} className="text-slate-500" />
      </div>
    </div>
  )
}
