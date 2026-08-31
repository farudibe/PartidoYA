import type { CanchaCercana } from '../types'

export function CourtCard({ cancha, onClick }: { cancha: CanchaCercana; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-xl border bg-white p-4 text-left shadow-sm hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">{cancha.nombre}</p>
          <p className="text-sm text-gray-500">{cancha.direccion}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary-dark">
          {cancha.distancia_km.toFixed(1)} km
        </span>
      </div>
      {cancha.descripcion && <p className="mt-2 text-sm text-gray-600">{cancha.descripcion}</p>}
    </button>
  )
}
