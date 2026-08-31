import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { Rol } from '../types'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<Rol>('jugador')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signUp(email, password, nombre, role)
    setLoading(false)
    if (error) setError(error)
    else navigate(role === 'jugador' ? '/jugador' : '/cancha')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-center">Crear cuenta</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setRole('jugador')}
            className={`rounded-lg border-2 py-3 font-semibold ${role === 'jugador' ? 'border-primary bg-primary/10 text-primary-dark' : 'border-gray-200'}`}>
            Soy Jugador
          </button>
          <button type="button" onClick={() => setRole('cancha')}
            className={`rounded-lg border-2 py-3 font-semibold ${role === 'cancha' ? 'border-primary bg-primary/10 text-primary-dark' : 'border-gray-200'}`}>
            Soy Cancha
          </button>
        </div>

        <input required placeholder={role === 'jugador' ? 'Tu nombre' : 'Nombre del predio'} value={nombre}
          onChange={(e) => setNombre(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <input type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border px-4 py-2" />
        <input type="password" required placeholder="Contraseña" value={password}
          onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border px-4 py-2" />

        {role === 'cancha' && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Para habilitarte como Cancha vas a tener que abonar la cuota mensual desde tu panel. Hasta entonces tu predio queda pendiente y no aparece en el mapa de los jugadores.
          </p>
        )}

        <button disabled={loading} className="w-full rounded-lg bg-primary py-2 font-semibold text-white disabled:opacity-50">
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
        <p className="text-center text-sm text-gray-500">
          ¿Ya tenés cuenta? <Link to="/login" className="text-primary font-semibold">Ingresá</Link>
        </p>
      </form>
    </div>
  )
}
