'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

interface Profile {
  id: string
  tenant_id: string
  branch_id: string | null
  role: 'dealer_admin' | 'branch_manager' | 'employee'
  name: string
  email: string
  avatar_url?: string | null
  created_at?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const fetchedUserIds = useRef<string | null>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    // Prevent duplicate concurrent/subsequent fetches for the same user
    if (fetchedUserIds.current === userId) {
      return
    }
    fetchedUserIds.current = userId

    try {
      // Retry logic for profile fetch (handles race condition after signup)
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (data && !error) {
          setProfile(data as Profile)
          return
        }

        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      setProfile(null)
    } catch (e) {
      console.error('Error fetching profile:', e)
      setProfile(null)
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (user) {
      fetchedUserIds.current = null // Allow forcing a refresh
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    fetchedUserIds.current = null
    window.location.href = '/sign-in'
  }, [supabase])

  useEffect(() => {
    let active = true

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (!active) return

        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        
        if (initialSession?.user) {
          fetchProfile(initialSession.user.id)
        } else {
          fetchedUserIds.current = null
          setProfile(null)
        }
      } catch (e) {
        console.error('Error fetching initial session:', e)
      } finally {
        if (active) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!active) return
        if (event === 'INITIAL_SESSION') return // Handled by initAuth

        try {
          setSession(newSession)
          setUser(newSession?.user ?? null)
          if (newSession?.user) {
            fetchProfile(newSession.user.id)
          } else {
            fetchedUserIds.current = null
            setProfile(null)
          }
        } catch (e) {
          console.error('Error in onAuthStateChange:', e)
        }
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
