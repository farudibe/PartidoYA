import { useEffect, useState } from 'react'

interface Coords {
  lat: number
  lng: number
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      setLoading(false)
      return
    }
    // watchPosition en vez de getCurrentPosition: así la ubicación se
    // actualiza sola si el usuario se mueve, en lugar de quedar fija en
    // la primera lectura ("en tiempo real").
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { coords, error, loading }
}
