import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Rol } from '../types'
import type { User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, nombre: string, role: Rol) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
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

  // El perfil ya NO se inserta desde el cliente: lo crea automáticamente
  // un trigger en la base (handle_new_user, ver supabase/schema.sql) a
  // partir de los metadatos (nombre, role) que mandamos acá. Así evitamos
  // el error de RLS que pasaba cuando la confirmación de email está
  // activada (en ese caso todavía no hay sesión al momento del signUp,
  // y el insert directo desde el cliente queda bloqueado por RLS).
  async function signUp(email: string, password: string, nombre: string, role: Rol) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, role } },
    })
    if (error) return { error: error.message, needsConfirmation: false }

    // Si Supabase no devuelve sesión, significa que la confirmación de
    // email está activada y la cuenta todavía no está confirmada.
    if (data.user && !data.session) {
      return { error: null, needsConfirmation: true }
    }

    if (data.user) await loadProfile(data.user.id)
    return { error: null, needsConfirmation: false }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) return { error: null }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Confirmá tu email antes de iniciar sesión. Revisá tu bandeja de entrada (y la carpeta de spam).' }
    }
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: 'Email o contraseña incorrectos.' }
    }
    return { error: error.message }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id)
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer`,
    })
    return { error: error ? error.message : null }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? error.message : null }
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
