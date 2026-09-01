import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Si faltan las variables de entorno, usamos valores de relleno para que
// createClient no explote y rompa toda la app (pantalla en blanco).
// En su lugar, "supabaseConfigured" queda en false y mostramos un aviso
// claro en pantalla (ver src/components/ConfigCheck.tsx).
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
