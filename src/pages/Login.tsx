import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
    else navigate('/')
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-center">Ingresar a PartidoYA</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-4 py-2"
        />
        <input
          type="password" required placeholder="Contraseña" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-4 py-2"
        />
        <button disabled={loading} className="w-full rounded-lg bg-primary py-2 font-semibold text-white disabled:opacity-50">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="text-center text-sm text-gray-500">
          ¿No tenés cuenta? <Link to="/registro" className="text-primary font-semibold">Registrate</Link>
        </p>
      </form>
    </div>
  )
}
