import Link from 'next/link'
import { ArrowRight, Car } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-grid">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <Car size={22} className="text-slate-900" />
          <span className="text-lg text-slate-900">Quotora</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="bg-white border border-slate-200 text-slate-600 rounded-full px-6 py-2.5 text-sm hover:bg-slate-50 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="bg-slate-900 text-white rounded-full px-6 py-2.5 text-sm hover:bg-slate-800 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 md:px-12">
        <div className="max-w-2xl text-center space-y-8">
          <h1 className="text-4xl md:text-5xl text-slate-900 leading-tight">
            Vehicle quotations, simplified
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto">
            The modern quotation platform for automobile dealerships.
            Build, manage, and export professional vehicle quotations in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="bg-slate-900 text-white rounded-full px-8 py-4 flex items-center gap-3 hover:bg-slate-800 transition-colors"
            >
              <ArrowRight size={18} />
              Create your dealership
            </Link>
            <Link
              href="/sign-in"
              className="bg-white border border-slate-200 text-slate-600 rounded-full px-8 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              Sign in to dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 text-center">
        <p className="text-sm text-slate-400">Quotora — Multi-tenant dealership platform</p>
      </footer>
    </div>
  )
}
