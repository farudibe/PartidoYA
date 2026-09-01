import type { CanchaCercana } from '../types'

export function CourtCard({ cancha, onClick }: { cancha: CanchaCercana; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-xl border bg-white p-3 text-left shadow-sm hover:shadow-md transition flex gap-3">
      {cancha.fotos?.[0] && (
        <img src={cancha.fotos[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      )}
      <div className="flex-1">
        <div className="flex justify-between items-start gap-2">
          <p className="font-semibold">{cancha.nombre}</p>
          {cancha.distancia_km != null && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary-dark">
              {cancha.distancia_km.toFixed(1)} km
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{cancha.direccion}</p>
        {cancha.descripcion && <p className="mt-1 text-sm text-gray-600">{cancha.descripcion}</p>}
      </div>
    </button>
  )
}
