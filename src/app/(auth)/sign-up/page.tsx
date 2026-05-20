'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import {
  Building2,
  User,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TenantData {
  name: string
}

interface AdminData {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

interface BranchData {
  name: string
  address: string
}

const STEPS = [
  { label: 'Company', icon: Building2 },
  { label: 'Admin', icon: User },
  { label: 'HQ Branch', icon: MapPin },
]

export default function SignUpPage() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const [tenant, setTenant] = useState<TenantData>({ name: '' })
  const [admin, setAdmin] = useState<AdminData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [branch, setBranch] = useState<BranchData>({ name: '', address: '' })

  const canProceedStep0 = tenant.name.trim().length >= 2
  const canProceedStep1 =
    admin.name.trim().length >= 2 &&
    admin.email.includes('@') &&
    admin.password.length >= 6 &&
    admin.password === admin.confirmPassword
  const canSubmit = branch.name.trim().length >= 2 && branch.address.trim().length >= 5

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)

    try {
      // 1. Sign up the user and pass onboarding data in user metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: admin.email,
        password: admin.password,
        options: {
          data: {
            name: admin.name,
            phone: admin.phone,
            tenant_name: tenant.name,
            branch_name: branch.name,
            branch_address: branch.address,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      if (authData.session) {
        addToast('Account created successfully', 'success')
        router.push('/dashboard')
      } else {
        addToast('Verification email sent! Please check your email to activate your account.', 'success')
        router.push('/sign-in')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2rem] bg-slate-900 text-white mb-4">
          <Building2 size={24} />
        </div>
        <h1 className="text-2xl text-slate-900">Create your account</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isCompleted = i < step
          return (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border border-slate-200'
                }`}
              >
                {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px ${i < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Form Card */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-6">
        {/* Step 0: Tenant */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="tenant-name" className="text-sm text-slate-600 pl-4">
                Company / Dealership name
              </label>
              <div className="relative">
                <Building2
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="tenant-name"
                  type="text"
                  value={tenant.name}
                  onChange={e => setTenant({ name: e.target.value })}
                  placeholder="e.g. Prime Motors Pvt. Ltd."
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              disabled={!canProceedStep0}
              className="w-full md:w-auto bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight size={18} />
              Continue
            </button>
          </div>
        )}

        {/* Step 1: Admin */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="admin-name" className="text-sm text-slate-600 pl-4">
                Your full name
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-name"
                  type="text"
                  value={admin.name}
                  onChange={e => setAdmin(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-email" className="text-sm text-slate-600 pl-4">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-email"
                  type="email"
                  value={admin.email}
                  onChange={e => setAdmin(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@dealership.com"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-phone" className="text-sm text-slate-600 pl-4">
                Phone number (optional)
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-phone"
                  type="tel"
                  value={admin.phone}
                  onChange={e => setAdmin(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm text-slate-600 pl-4">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={admin.password}
                  onChange={e => setAdmin(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-full py-4 pl-14 pr-14 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="admin-confirm-password" className="text-sm text-slate-600 pl-4">
                Confirm password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="admin-confirm-password"
                  type="password"
                  value={admin.confirmPassword}
                  onChange={e => setAdmin(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter password"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
              {admin.confirmPassword && admin.password !== admin.confirmPassword && (
                <p className="text-sm text-rose-500 pl-4">Passwords do not match</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(0)}
                className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 flex items-center justify-start gap-3 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full md:w-auto bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRight size={18} />
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: HQ Branch */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="branch-name" className="text-sm text-slate-600 pl-4">
                Main branch name
              </label>
              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="branch-name"
                  type="text"
                  value={branch.name}
                  onChange={e => setBranch(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Downtown Showroom"
                  className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="branch-address" className="text-sm text-slate-600 pl-4">
                Branch address
              </label>
              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <textarea
                  id="branch-address"
                  value={branch.address}
                  onChange={e => setBranch(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address with city and pincode"
                  rows={3}
                  className="w-full rounded-[1.5rem] py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(1)}
                className="bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8 flex items-center justify-start gap-3 hover:bg-slate-50 transition-colors flex-1 sm:flex-initial"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="w-full md:w-auto bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={18} />
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-slate-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
