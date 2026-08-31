import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { Rol } from '../types'

export function ProtectedRoute({ children, role }: { children: JSX.Element; role?: Rol }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/" replace />

  return children
}
