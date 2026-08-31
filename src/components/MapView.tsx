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

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom())
  }, [lat, lng])
  return null
}

interface Props {
  userLat: number
  userLng: number
  canchas: CanchaCercana[]
  onSelect?: (c: CanchaCercana) => void
}

export default function MapView({ userLat, userLng, canchas, onSelect }: Props) {
  return (
    <MapContainer center={[userLat, userLng]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={userLat} lng={userLng} />
      <Marker position={[userLat, userLng]} icon={userIcon}>
        <Popup>Tu ubicación</Popup>
      </Marker>
      {canchas.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{c.nombre}</p>
              <p className="text-xs text-gray-500">{c.direccion}</p>
              <p className="text-xs">{c.distancia_km.toFixed(1)} km</p>
              {onSelect && (
                <button onClick={() => onSelect(c)} className="mt-1 rounded bg-primary px-2 py-1 text-xs text-white">
                  Ver turnos
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
