import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// El usuario llega acá desde el link del mail de "recuperar contraseña".
// Supabase ya se encarga de crear una sesión temporal a partir del link
// (lee el token de la URL automáticamente), así que solo pedimos la
// contraseña nueva y llamamos a updatePassword.
export default function ResetPassword() {
  const { user, loading: authLoading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) setError(error)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold">Contraseña actualizada ✅</h1>
          <p className="text-sm text-gray-600">Ya podés seguir usando PartidoYA con tu contraseña nueva.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full rounded-lg bg-primary py-2 font-semibold text-white"
          >
            Ir a PartidoYA
          </button>
        </div>
      </div>
    )
  }

  if (!authLoading && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold text-red-700">Link inválido o vencido</h1>
          <p className="text-sm text-gray-600">
            Pedí un nuevo link desde "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.
          </p>
          <button
            onClick={() => navigate('/recuperar')}
            className="w-full rounded-lg bg-primary py-2 font-semibold text-white"
          >
            Pedir link nuevo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-center">Elegí tu nueva contraseña</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          type="password" required placeholder="Contraseña nueva" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-4 py-2"
        />
        <button disabled={loading} className="w-full rounded-lg bg-primary py-2 font-semibold text-white disabled:opacity-50">
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
