import { ReactNode } from 'react'
import { supabaseConfigured } from '../lib/supabaseClient'

// Pantalla de aviso si faltan las variables de entorno de Supabase,
// en vez de dejar la app en blanco sin ninguna pista de qué pasó.
export function ConfigCheck({ children }: { children: ReactNode }) {
  if (!supabaseConfigured) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-red-50 px-6 text-center">
        <h1 className="text-xl font-bold text-red-700">Faltan datos de configuración</h1>
        <p className="max-w-md text-sm text-red-700">
          No se encontraron las variables <code>VITE_SUPABASE_URL</code> y/o{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>. Andá a Cloudflare → tu proyecto → Settings →
          Variables and Secrets, verificá que estén cargadas EXACTAMENTE con esos nombres
          (sin espacios, sin comillas), y generá un build nuevo después de guardarlas.
        </p>
      </div>
    )
  }
  return <>{children}</>
}
