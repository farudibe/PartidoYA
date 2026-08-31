import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subirComprobante } from '../lib/storage'
import { useAuth } from '../contexts/AuthContext'
import { useGeolocation } from '../hooks/useGeolocation'
import MapView from '../components/MapView'
import { CourtCard } from '../components/CourtCard'
import type { CanchaCercana, Turno, TurnoOcupado, Cancha } from '../types'

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export default function PlayerDashboard() {
  const { signOut } = useAuth()
  const { coords, error: geoError, loading: geoLoading } = useGeolocation()
  const [canchas, setCanchas] = useState<CanchaCercana[]>([])
  const [radioKm, setRadioKm] = useState(15)
  const [seleccionada, setSeleccionada] = useState<CanchaCercana | null>(null)
  const [canchaCompleta, setCanchaCompleta] = useState<Cancha | null>(null)
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [ocupados, setOcupados] = useState<TurnoOcupado[]>([])
  const [loadingTurnos, setLoadingTurnos] = useState(false)
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [turnoASenar, setTurnoASenar] = useState<Turno | null>(null)
  const [pasoSena, setPasoSena] = useState<0 | 1>(0) // 0=alias+comprobante, para el caso sin link de MP
  const [nombreCuentaPagador, setNombreCuentaPagador] = useState('')
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [enviandoSena, setEnviandoSena] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    if (!coords) return
    supabase
      .rpc('canchas_cercanas', { lat: coords.lat, lng: coords.lng, radio_km: radioKm })
      .then(({ data, error }) => {
        if (!error && data) setCanchas(data as CanchaCercana[])
      })
  }, [coords, radioKm])

  async function abrirCancha(c: CanchaCercana) {
    setSeleccionada(c)
    setTurnoASenar(null)
    setLoadingTurnos(true)
    const { data: cd } = await supabase.from('canchas').select('*').eq('id', c.id).single()
    setCanchaCompleta(cd as Cancha | null)
    const diaSemana = new Date(fecha + 'T00:00:00').getDay()
    const { data: turnosData } = await supabase
      .from('turnos')
      .select('*')
      .eq('cancha_id', c.id)
      .eq('activo', true)
      .or(`dia_semana.eq.${diaSemana},fecha.eq.${fecha}`)
      .order('hora_inicio')
    setTurnos((turnosData as Turno[]) ?? [])
    const { data: ocupadosData } = await supabase.from('turnos_ocupados').select('*').eq('fecha', fecha)
    setOcupados((ocupadosData as TurnoOcupado[]) ?? [])
    setLoadingTurnos(false)
  }

  useEffect(() => {
    if (seleccionada) abrirCancha(seleccionada)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha])

  function estaOcupado(turnoId: string) {
    return ocupados.some((o) => o.turno_id === turnoId && o.fecha === fecha)
  }

  function elegirTurno(t: Turno) {
    setTurnoASenar(t)
    setPasoSena(0)
    setNombreCuentaPagador('')
    setComprobanteFile(null)
    setMensaje(null)
  }

  async function confirmarSenaMP() {
    if (!turnoASenar) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { error } = await supabase.from('reservas').insert({
      turno_id: turnoASenar.id,
      jugador_id: userData.user.id,
      fecha,
      status: 'señada',
      metodo_pago: 'mercadopago',
    })
    if (!error) {
      setMensaje('¡Cancha señada! Ya nadie más puede reservar ese día y horario.')
      setTurnoASenar(null)
      abrirCancha(seleccionada!)
    } else {
      setMensaje('No se pudo confirmar la seña: ' + error.message)
    }
  }

  async function confirmarSenaTransferencia() {
    if (!turnoASenar || !comprobanteFile || !nombreCuentaPagador) return
    setEnviandoSena(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const url = await subirComprobante(comprobanteFile, `sena-${userData.user.id}`)
      const { error } = await supabase.from('reservas').insert({
        turno_id: turnoASenar.id,
        jugador_id: userData.user.id,
        fecha,
        status: 'señada',
        metodo_pago: 'transferencia',
        nombre_cuenta_pagador: nombreCuentaPagador,
        comprobante_url: url,
      })
      if (!error) {
        setMensaje('¡Cancha señada! Ya nadie más puede reservar ese día y horario.')
        setTurnoASenar(null)
        abrirCancha(seleccionada!)
      } else {
        setMensaje('No se pudo confirmar la seña: ' + error.message)
      }
    } finally {
      setEnviandoSena(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-white">
        <h1 className="text-lg font-bold">PartidoYA</h1>
        <button onClick={signOut} className="text-sm text-white/80">Salir</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-full max-w-sm overflow-y-auto border-r bg-gray-50 p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500">Radio de búsqueda: {radioKm} km</label>
            <input type="range" min={1} max={50} value={radioKm} onChange={(e) => setRadioKm(Number(e.target.value))} className="w-full" />
          </div>

          {geoLoading && <p className="text-sm text-gray-500">Obteniendo tu ubicación...</p>}
          {geoError && <p className="text-sm text-red-600">No pudimos acceder a tu ubicación: {geoError}</p>}

          {!seleccionada && canchas.map((c) => (
            <CourtCard key={c.id} cancha={c} onClick={() => abrirCancha(c)} />
          ))}
          {!seleccionada && coords && canchas.length === 0 && (
            <p className="text-sm text-gray-500">No hay canchas activas cerca. Probá ampliar el radio.</p>
          )}

          {seleccionada && !turnoASenar && (
            <div className="space-y-3">
              <button onClick={() => { setSeleccionada(null); setTurnos([]); setMensaje(null) }} className="text-sm text-primary-dark">
                ← Volver
              </button>
              <h2 className="font-bold">{seleccionada.nombre}</h2>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-lg border px-3 py-2" />

              {loadingTurnos && <p className="text-sm text-gray-500">Buscando turnos...</p>}
              {!loadingTurnos && turnos.length === 0 && <p className="text-sm text-gray-500">No hay turnos disponibles ese día.</p>}
              <div className="space-y-2">
                {turnos.map((t) => {
                  const ocupado = estaOcupado(t.id)
                  return (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                      <div>
                        <p className="font-semibold">{t.hora_inicio.slice(0, 5)} - {t.hora_fin.slice(0, 5)}</p>
                        <p className="text-xs text-gray-500">
                          Cancha {t.numero_cancha}
                          {t.precio ? ` · Total $${t.precio}` : ''}
                          {t.sena ? ` · Seña $${t.sena}` : ''}
                        </p>
                      </div>
                      {ocupado ? (
                        <span className="rounded-lg bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-500">Señado</span>
                      ) : (
                        <button onClick={() => elegirTurno(t)} className="rounded-lg bg-green-600 px-3 py-1 text-sm font-semibold text-white">
                          Señar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {mensaje && <p className="text-sm">{mensaje}</p>}
            </div>
          )}

          {turnoASenar && canchaCompleta && (
            <div className="space-y-3">
              <button onClick={() => setTurnoASenar(null)} className="text-sm text-primary-dark">← Volver a los turnos</button>

              <div className="rounded-xl border bg-white p-4 space-y-1">
                <h2 className="font-bold">{canchaCompleta.nombre}</h2>
                <p className="text-sm text-gray-600">
                  {DIAS[new Date(fecha + 'T00:00:00').getDay()].charAt(0).toUpperCase() + DIAS[new Date(fecha + 'T00:00:00').getDay()].slice(1)}, {fecha}
                </p>
                <p className="text-sm text-gray-600">{turnoASenar.hora_inicio.slice(0, 5)} - {turnoASenar.hora_fin.slice(0, 5)} · Cancha {turnoASenar.numero_cancha}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <p className="text-xs text-gray-500">Valor total</p>
                    <p className="font-bold">{turnoASenar.precio ? `$${turnoASenar.precio}` : '—'}</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <p className="text-xs text-primary-dark">Valor de la seña</p>
                    <p className="font-bold text-primary-dark">{turnoASenar.sena ? `$${turnoASenar.sena}` : '—'}</p>
                  </div>
                </div>
              </div>

              {canchaCompleta.mp_link_pago ? (
                <div className="space-y-2 rounded-xl border bg-white p-4">
                  <p className="text-sm text-gray-600">Esta cancha cobra la seña por Mercado Pago:</p>
                  <a
                    href={canchaCompleta.mp_link_pago}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg bg-primary py-2 text-center text-sm font-semibold text-white"
                  >
                    Pagar seña con Mercado Pago
                  </a>
                  <button onClick={confirmarSenaMP} className="w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white">
                    Ya pagué, confirmar seña
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border bg-white p-4">
                  {pasoSena === 0 && (
                    <>
                      <p className="text-sm text-gray-600">¿Con qué cuenta vas a transferir la seña?</p>
                      <input
                        placeholder="Nombre de la cuenta con la que vas a enviar"
                        value={nombreCuentaPagador}
                        onChange={(e) => setNombreCuentaPagador(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                      <button
                        disabled={!nombreCuentaPagador}
                        onClick={() => setPasoSena(1)}
                        className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        Continuar
                      </button>
                    </>
                  )}
                  {pasoSena === 1 && (
                    <>
                      <p className="text-sm text-gray-600">Transferí la seña al alias de la cancha:</p>
                      <p className="rounded-lg bg-primary/10 px-3 py-2 text-center text-lg font-bold text-primary-dark">
                        {canchaCompleta.alias_transferencia || 'Consultale el alias a la cancha'}
                      </p>
                      <p className="text-sm text-gray-600">Ahora subí una foto del comprobante:</p>
                      <input type="file" accept="image/*" onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
                      <button
                        disabled={!comprobanteFile || enviandoSena}
                        onClick={confirmarSenaTransferencia}
                        className="w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {enviandoSena ? 'Enviando...' : 'Confirmar seña'}
                      </button>
                    </>
                  )}
                </div>
              )}
              {mensaje && <p className="text-sm">{mensaje}</p>}
            </div>
          )}
        </aside>

        <main className="flex-1">
          {coords ? (
            <MapView userLat={coords.lat} userLng={coords.lng} canchas={canchas} onSelect={abrirCancha} />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">Esperando ubicación...</div>
          )}
        </main>
      </div>
    </div>
  )
}
