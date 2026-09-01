// Convierte una dirección en coordenadas (lat/lng) usando Nominatim, el
// geocodificador gratuito de OpenStreetMap. No requiere API key.
// Referencia: https://nominatim.org/release-docs/latest/api/Search/
export async function geocodeDireccion(
  direccion: string,
  codigoPostal: string,
  provincia: string
): Promise<{ lat: number; lng: number } | null> {
  const query = `${direccion}, ${codigoPostal}, ${provincia}, Argentina`
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(query)}`

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null

  const { lat, lon } = data[0]
  return { lat: parseFloat(lat), lng: parseFloat(lon) }
}
