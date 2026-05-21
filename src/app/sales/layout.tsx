import { AuthProvider } from '@/components/providers/AuthProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { PortalShell } from '@/components/layout/PortalShell'
import { SALES_EXECUTIVE_NAV, SALES_EXECUTIVE_ROUTE_TITLES } from '@/lib/permissions'

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <PortalShell
          navItems={SALES_EXECUTIVE_NAV}
          routeTitles={SALES_EXECUTIVE_ROUTE_TITLES}
          portalName="Quotora Sales"
        >
          {children}
        </PortalShell>
      </ToastProvider>
    </AuthProvider>
  )
}
