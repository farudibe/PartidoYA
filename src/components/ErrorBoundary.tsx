import { Component, ReactNode } from 'react'

interface State {
  error: Error | null
}

// Atrapa cualquier error de la app y lo muestra en pantalla en vez de
// dejar una página en blanco sin explicación.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-red-50 px-6 text-center">
          <h1 className="text-xl font-bold text-red-700">Ocurrió un error</h1>
          <p className="max-w-md text-sm text-red-700">{this.state.error.message}</p>
          <p className="max-w-md text-xs text-red-500">
            Sacá una captura de esta pantalla completa y mandala para revisarlo.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
