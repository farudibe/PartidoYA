import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import type { CanchaCercana } from '../types'

// Fix de íconos default de Leaflet con bundlers (Vite)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const userIcon = new L.DivIcon({
  className: '',
  html: '<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #2563eb66"></div>',
  iconSize: [16, 16],
})

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], zoom ?? map.getZoom())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])
  return null
}

interface Props {
  userLat: number
  userLng: number
  canchas: CanchaCercana[]
  onSelect?: (c: CanchaCercana) => void
  // Opcional: centra el mapa acá en vez de en la ubicación del usuario.
  // Se usa cuando el jugador encuentra una cancha por nombre fuera de su radio.
  center?: { lat: number; lng: number }
  // Opcional: cancha seleccionada que puede no estar en `canchas` (por ej.
  // un resultado de búsqueda por nombre fuera del radio actual). Si ya está
  // en `canchas`, no se duplica.
  resaltada?: CanchaCercana | null
}

export default function MapView({ userLat, userLng, canchas, onSelect, center, resaltada }: Props) {
  const centro = center ?? { lat: userLat, lng: userLng }
  const mostrarResaltadaAparte = resaltada && !canchas.some((c) => c.id === resaltada.id)
  return (
    <MapContainer center={[centro.lat, centro.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={centro.lat} lng={centro.lng} zoom={center ? 15 : undefined} />
      <Marker position={[userLat, userLng]} icon={userIcon}>
        <Popup>Tu ubicación</Popup>
      </Marker>
      {canchas.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{c.nombre}</p>
              <p className="text-xs text-gray-500">{c.direccion}</p>
              {c.distancia_km != null && <p className="text-xs">{c.distancia_km.toFixed(1)} km</p>}
              {onSelect && (
                <button onClick={() => onSelect(c)} className="mt-1 rounded bg-primary px-2 py-1 text-xs text-white">
                  Ver turnos
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      {mostrarResaltadaAparte && resaltada && (
        <Marker position={[resaltada.lat, resaltada.lng]}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{resaltada.nombre}</p>
              <p className="text-xs text-gray-500">{resaltada.direccion}</p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
