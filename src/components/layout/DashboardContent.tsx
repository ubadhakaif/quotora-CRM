'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          {/* Elegant premium loader matching slate design system */}
          <div className="w-12 h-12 rounded-full border-[3px] border-slate-100 border-t-slate-900 animate-spin" />
          <p className="text-sm text-slate-500 font-medium tracking-wide">Loading Quotora...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Redirecting to sign-in
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar with controlled mobile open state */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with hamburger menu trigger */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto bg-grid">
          <div className="pt-[30px] px-6 md:px-12 pb-32">
            <div className="max-w-7xl mx-auto space-y-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
