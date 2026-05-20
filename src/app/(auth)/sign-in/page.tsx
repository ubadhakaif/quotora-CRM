'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/providers/ToastProvider'
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      addToast(error.message, 'error')
      setLoading(false)
      return
    }

    addToast('Signed in successfully', 'success')
    router.push('/dashboard')
  }

  return (
    <div className="space-y-8">
      {/* Logo / Brand */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[2rem] bg-slate-900 text-white mb-4">
          <LogIn size={24} />
        </div>
        <h1 className="text-2xl text-slate-900">Sign in to Quotora</h1>
      </div>

      {/* Sign In Card */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 md:p-10 space-y-6">
        <form onSubmit={handleSignIn} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="signin-email" className="text-sm text-slate-600 pl-4">
              Email address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@dealership.com"
                required
                className="w-full rounded-full py-4 pl-14 pr-6 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white transition-all outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="signin-password" className="text-sm text-slate-600 pl-4">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-slate-900 text-white rounded-full px-8 py-4 flex items-center justify-start gap-3 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>

      {/* Footer link */}
      <p className="text-center text-sm text-slate-500">
        New to Quotora?{' '}
        <Link href="/sign-up" className="text-slate-900 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
