import { AuthProvider } from '@/components/providers/AuthProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { BottomNavPill } from '@/components/layout/BottomNavPill'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar (desktop) */}
          <Sidebar />

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-grid">
              <div className="pt-[30px] md:pt-[30px] px-6 md:px-12 pb-32">
                <div className="max-w-7xl mx-auto space-y-8">
                  {children}
                </div>
              </div>
            </main>
          </div>

          {/* Bottom Nav Pill (mobile) */}
          <BottomNavPill />
        </div>
      </ToastProvider>
    </AuthProvider>
  )
}
