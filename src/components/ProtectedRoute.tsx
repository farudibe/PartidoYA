import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { Rol } from '../types'

export function ProtectedRoute({ children, role }: { children: JSX.Element; role?: Rol }) {
  const { user, profile, loading, profileLoading } = useAuth()

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  // Esperamos a que el perfil termine de cargar antes de comparar el rol.
  // Si no, "profile" todavía es null en el instante justo después del
  // login y el chequeo de abajo mandaría siempre de vuelta a "/".
  if (profileLoading) return <div className="flex h-screen items-center justify-center">Cargando...</div>
  if (role && profile?.role !== role) return <Navigate to="/" replace />

  return children
}
