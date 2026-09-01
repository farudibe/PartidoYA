import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) setError(error)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold">Revisá tu email ✉️</h1>
          <p className="text-sm text-gray-600">
            Si <span className="font-semibold">{email}</span> tiene una cuenta con nosotros, te mandamos un link
            para restablecer tu contraseña.
          </p>
          <Link to="/login" className="inline-block w-full rounded-lg bg-primary py-2 font-semibold text-white">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-center">Recuperar contraseña</h1>
        <p className="text-center text-sm text-gray-500">
          Ingresá tu email y te mandamos un link para restablecerla.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-4 py-2"
        />
        <button disabled={loading} className="w-full rounded-lg bg-primary py-2 font-semibold text-white disabled:opacity-50">
          {loading ? 'Enviando...' : 'Enviar link'}
        </button>
        <p className="text-center text-sm text-gray-500">
          <Link to="/login" className="text-primary font-semibold">Volver a iniciar sesión</Link>
        </p>
      </form>
    </div>
  )
}
