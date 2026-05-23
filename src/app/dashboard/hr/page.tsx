'use client'

import { useState, useEffect } from 'react'
import { Clock, CalendarDays, Users, Building2 } from 'lucide-react'
import { AttendanceTab } from './components/AttendanceTab'
import { LeaveTab } from './components/LeaveTab'
import { WorkforceTab } from './components/WorkforceTab'
import { BranchesTab } from './components/BranchesTab'

const tabs = [
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'leave', label: 'Leave', icon: CalendarDays },
  { id: 'workforce', label: 'Workforce', icon: Users },
  { id: 'branches', label: 'Branches', icon: Building2 },
]

export default function HumanResourcesPage() {
  const [activeTab, setActiveTab] = useState('attendance')

  // Parse tab parameter safely client-side to preserve browser routing & dynamic link triggers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam && tabs.some(t => t.id === tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div>
        <h1 className="text-3xl font-black text-slate-950 tracking-tight">Human Resources</h1>
        <p className="text-xs text-slate-500 mt-1">Manage personnel, rosters, branch assignments, and audit team presence records.</p>
      </div>

      {/* Standard Underline Tab bar with Horizontal Hidden Scroll */}
      <div className="border-b border-slate-200 w-full relative">
        <nav className="flex -mb-px space-x-4 sm:space-x-8 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Tabs">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  // Update search param without reloading page to preserve state
                  if (typeof window !== 'undefined') {
                    const newUrl = `${window.location.pathname}?tab=${tab.id}`
                    window.history.replaceState({ path: newUrl }, '', newUrl)
                  }
                }}
                className={`
                  flex items-center justify-center sm:justify-start gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-initial
                  ${isActive
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }
                `}
                title={tab.label}
              >
                <Icon size={16} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {activeTab === 'attendance' && <AttendanceTab />}
        {activeTab === 'leave' && <LeaveTab />}
        {activeTab === 'workforce' && <WorkforceTab />}
        {activeTab === 'branches' && <BranchesTab />}
      </div>
    </div>
  )
}
