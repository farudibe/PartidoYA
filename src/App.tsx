import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import PlayerDashboard from './pages/PlayerDashboard'
import CourtOwnerDashboard from './pages/CourtOwnerDashboard'

function Home() {
  const { user, profile } = useAuth()
  if (user && profile) {
    return <Navigate to={profile.role === 'jugador' ? '/jugador' : '/cancha'} replace />
  }
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary to-primary-dark text-white text-center px-6">
      <h1 className="text-4xl font-bold">PartidoYA ⚽</h1>
      <p className="max-w-md text-lg">Encontrá y reservá canchas cerca tuyo, o registrá tu predio y empezá a recibir reservas.</p>
      <div className="flex gap-4">
        <Link to="/login" className="rounded-lg bg-white px-6 py-2 font-semibold text-primary-dark">Ingresar</Link>
        <Link to="/registro" className="rounded-lg border-2 border-white px-6 py-2 font-semibold">Registrarme</Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route
        path="/jugador"
        element={
          <ProtectedRoute role="jugador">
            <PlayerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cancha"
        element={
          <ProtectedRoute role="cancha">
            <CourtOwnerDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
