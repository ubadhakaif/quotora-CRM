import { AuthProvider } from '@/components/providers/AuthProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </ToastProvider>
    </AuthProvider>
  )
}
