import { AuthProvider } from '@/components/providers/AuthProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { PortalShell } from '@/components/layout/PortalShell'
import { BRANCH_MANAGER_NAV, BRANCH_MANAGER_ROUTE_TITLES } from '@/lib/permissions'

export default function BranchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <PortalShell
          navItems={BRANCH_MANAGER_NAV}
          routeTitles={BRANCH_MANAGER_ROUTE_TITLES}
          portalName="Quotora Branch"
        >
          {children}
        </PortalShell>
      </ToastProvider>
    </AuthProvider>
  )
}
