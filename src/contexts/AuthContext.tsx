import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Rol } from '../types'
import type { User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, nombre: string, role: Rol) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data as Profile | null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, nombre: string, role: Rol) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, nombre, role })
      if (profileError) return { error: profileError.message }
      await loadProfile(data.user.id)
    }
    return { error: null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? error.message : null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
