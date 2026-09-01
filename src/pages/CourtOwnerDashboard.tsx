import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subirComprobante, subirFotosCancha } from '../lib/storage'
import { geocodeDireccion } from '../lib/geocoding'
import { useAuth } from '../contexts/AuthContext'
import { ALIAS_PARTIDOYA, PROVINCIAS_ARGENTINA } from '../types'
import type { Cancha, Turno, PagoCuota } from '../types'

const MIN_FOTOS = 2

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function CourtOwnerDashboard() {
  const { user, signOut } = useAuth()
  const [cancha, setCancha] = useState<Cancha | null>(null)
  const [ultimoPago, setUltimoPago] = useState<PagoCuota | null>(null)
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  // Formulario de alta de cancha
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [provincia, setProvincia] = useState('')
  const [cantidadCanchas, setCantidadCanchas] = useState(1)
  const [aliasTransferencia, setAliasTransferencia] = useState('')
  const [mpLinkPago, setMpLinkPago] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const [creandoCancha, setCreandoCancha] = useState(false)
  const [errorCancha, setErrorCancha] = useState<string | null>(null)

  // Formulario de nuevo turno
  const [numeroCancha, setNumeroCancha] = useState(1)
  const [diaSemana, setDiaSemana] = useState(1)
  const [horaInicio, setHoraInicio] = useState('18:00')
  const [horaFin, setHoraFin] = useState('19:00')
  const [precio, setPrecio] = useState('')
  const [sena, setSena] = useState('')

  // Formulario de pago de cuota mensual
  const [pasoPago, setPasoPago] = useState<0 | 1 | 2>(0) // 0=cerrado, 1=nombre cuenta, 2=alias+comprobante
  const [nombreCuentaPagador, setNombreCuentaPagador] = useState('')
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [enviandoPago, setEnviandoPago] = useState(false)

  async function cargarTodo() {
    if (!user) return
    setLoading(true)
    const { data: canchaData } = await supabase.from('canchas').select('*').eq('owner_id', user.id).maybeSingle()
    setCancha(canchaData as Cancha | null)
    if (canchaData) {
      const { data: pagos } = await supabase
        .from('pagos_cuota')
        .select('*')
        .eq('cancha_id', canchaData.id)
        .order('created_at', { ascending: false })
        .limit(1)
      setUltimoPago((pagos?.[0] as PagoCuota) ?? null)
      const { data: turnosData } = await supabase.from('turnos').select('*').eq('cancha_id', canchaData.id).order('dia_semana')
      setTurnos((turnosData as Turno[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { cargarTodo() }, [user])

  async function crearCancha(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (fotos.length < MIN_FOTOS) {
      setErrorCancha(`Tenés que adjuntar al menos ${MIN_FOTOS} fotos de la cancha.`)
      return
    }
    setErrorCancha(null)
    setCreandoCancha(true)
    try {
      // 1) Convertimos la dirección que cargó el dueño en lat/lng automáticamente
      const ubicacion = await geocodeDireccion(direccion, codigoPostal, provincia)
      if (!ubicacion) {
        setErrorCancha('No pudimos ubicar esa dirección en el mapa. Revisá que la dirección, el código postal y la provincia estén bien escritos.')
        return
      }

      // 2) Subimos las fotos
      const urlsFotos = await subirFotosCancha(fotos, `cancha-${user.id}`)

      // 3) Creamos la cancha ya con la ubicación calculada
      const { error } = await supabase.from('canchas').insert({
        owner_id: user.id,
        nombre,
        direccion,
        codigo_postal: codigoPostal,
        provincia,
        cantidad_canchas: cantidadCanchas,
        ubicacion: `SRID=4326;POINT(${ubicacion.lng} ${ubicacion.lat})`,
        alias_transferencia: aliasTransferencia || null,
        mp_link_pago: mpLinkPago || null,
        fotos: urlsFotos,
        status: 'pendiente',
      })
      if (error) {
        setErrorCancha('No se pudo crear el predio: ' + error.message)
      } else {
        cargarTodo()
      }
    } catch (err) {
      setErrorCancha(err instanceof Error ? err.message : 'Ocurrió un error inesperado.')
    } finally {
      setCreandoCancha(false)
    }
  }

  async function agregarTurno(e: React.FormEvent) {
    e.preventDefault()
    if (!cancha) return
    const { error } = await supabase.from('turnos').insert({
      cancha_id: cancha.id,
      numero_cancha: numeroCancha,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      precio: precio ? Number(precio) : null,
      sena: sena ? Number(sena) : null,
    })
    if (!error) {
      setPrecio(''); setSena('')
      cargarTodo()
    }
  }

  async function enviarComprobantePago() {
    if (!cancha || !comprobanteFile || !nombreCuentaPagador) return
    setEnviandoPago(true)
    try {
      const url = await subirComprobante(comprobanteFile, `cuota-${cancha.id}`)
      const { error } = await supabase.from('pagos_cuota').insert({
        cancha_id: cancha.id,
        nombre_cuenta_pagador: nombreCuentaPagador,
        comprobante_url: url,
      })
      if (!error) {
        setPasoPago(0)
        setNombreCuentaPagador('')
        setComprobanteFile(null)
        cargarTodo()
      }
    } finally {
      setEnviandoPago(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-white">
        <h1 className="text-lg font-bold">PartidoYA · Panel de Cancha</h1>
        <button onClick={signOut} className="text-sm text-white/80">Salir</button>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-4">
        {!cancha ? (
          <form onSubmit={crearCancha} className="space-y-3 rounded-xl bg-white p-6 shadow">
            <h2 className="text-lg font-bold">Registrá tu predio</h2>
            <input required placeholder="Nombre del predio" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
            <input required placeholder="Dirección (calle y número)" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Código postal" value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} className="rounded-lg border px-3 py-2" />
              <select required value={provincia} onChange={(e) => setProvincia(e.target.value)} className="rounded-lg border px-3 py-2">
                <option value="" disabled>Provincia</option>
                {PROVINCIAS_ARGENTINA.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <input required type="number" min={1} placeholder="Cantidad de canchas" value={cantidadCanchas} onChange={(e) => setCantidadCanchas(Number(e.target.value))} className="w-full rounded-lg border px-3 py-2" />
            <p className="text-xs text-gray-500">Con la dirección, el código postal y la provincia ubicamos tu predio automáticamente en el mapa — no hace falta que sepas la latitud/longitud.</p>

            <hr />
            <div>
              <p className="text-sm font-semibold">Fotos de la cancha</p>
              <p className="text-xs text-gray-500 mb-1">Subí al menos {MIN_FOTOS} fotos del predio.</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
                className="w-full text-sm"
              />
              {fotos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {fotos.map((f, i) => (
                    <img key={i} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              {fotos.length > 0 && fotos.length < MIN_FOTOS && (
                <p className="mt-1 text-xs text-amber-600">Faltan {MIN_FOTOS - fotos.length} foto(s) más.</p>
              )}
            </div>

            <hr />
            <p className="text-sm font-semibold">Datos para que los jugadores te paguen la seña</p>
            <input placeholder="Tu alias de Mercado Pago / CBU (para transferencias)" value={aliasTransferencia} onChange={(e) => setAliasTransferencia(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
            <input placeholder="Link de pago de Mercado Pago (opcional, si tenés)" value={mpLinkPago} onChange={(e) => setMpLinkPago(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
            <p className="text-xs text-gray-500">Si cargás el link de Mercado Pago, el jugador va a pagar ahí directo. Si no, va a ver tu alias y va a subir el comprobante de la transferencia.</p>

            {errorCancha && <p className="text-sm text-red-600">{errorCancha}</p>}

            <button disabled={creandoCancha} className="w-full rounded-lg bg-primary py-2 font-semibold text-white disabled:opacity-50">
              {creandoCancha ? 'Ubicando predio y subiendo fotos...' : 'Crear predio'}
            </button>
          </form>
        ) : (
          <>
            <div className="rounded-xl bg-white p-6 shadow space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{cancha.nombre}</h2>
                <EstadoBadge status={cancha.status} />
              </div>
              <p className="text-sm text-gray-500">{cancha.direccion}{cancha.provincia ? `, ${cancha.provincia}` : ''}</p>

              {cancha.fotos && cancha.fotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {cancha.fotos.map((url, i) => (
                    <img key={i} src={url} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              {cancha.status !== 'activa' && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 space-y-3">
                  <p>
                    {cancha.status === 'pendiente' && 'Tu predio todavía no aparece en el mapa de los jugadores. Aboná la cuota mensual para habilitarlo.'}
                    {cancha.status === 'pausada' && 'Tu predio está pausado por falta de pago. Regularizá la cuota para volver a aparecer en las búsquedas.'}
                  </p>

                  {ultimoPago?.status === 'en_revision' && (
                    <p className="rounded-lg bg-white p-2 text-xs text-gray-600">
                      Ya enviaste un comprobante ({ultimoPago.nombre_cuenta_pagador}) y está en revisión. Te avisamos apenas se active.
                    </p>
                  )}

                  {pasoPago === 0 && (
                    <button onClick={() => setPasoPago(1)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                      Abonar cuota mensual
                    </button>
                  )}

                  {pasoPago === 1 && (
                    <div className="space-y-2 rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-600">Primero, ¿con qué cuenta vas a transferir?</p>
                      <input
                        placeholder="Nombre de la cuenta con la que vas a transferir"
                        value={nombreCuentaPagador}
                        onChange={(e) => setNombreCuentaPagador(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                      <button
                        disabled={!nombreCuentaPagador}
                        onClick={() => setPasoPago(2)}
                        className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        Continuar
                      </button>
                    </div>
                  )}

                  {pasoPago === 2 && (
                    <div className="space-y-3 rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-600">Transferí la cuota mensual a este alias:</p>
                      <p className="rounded-lg bg-primary/10 px-3 py-2 text-center text-lg font-bold text-primary-dark">
                        {ALIAS_PARTIDOYA}
                      </p>
                      <p className="text-xs text-gray-600">Ahora subí una foto del comprobante:</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
                        className="w-full text-sm"
                      />
                      <button
                        disabled={!comprobanteFile || enviandoPago}
                        onClick={enviarComprobantePago}
                        className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-40"
                      >
                        {enviandoPago ? 'Enviando...' : 'Enviar comprobante'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white p-6 shadow space-y-4">
              <h2 className="text-lg font-bold">Turnos y horarios</h2>
              <form onSubmit={agregarTurno} className="grid grid-cols-2 gap-3">
                <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))} className="rounded-lg border px-3 py-2">
                  {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="number" min={1} max={cancha.cantidad_canchas} value={numeroCancha} onChange={(e) => setNumeroCancha(Number(e.target.value))} placeholder="N° cancha" className="rounded-lg border px-3 py-2" />
                <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="rounded-lg border px-3 py-2" />
                <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="rounded-lg border px-3 py-2" />
                <input type="number" placeholder="Valor total de la cancha" value={precio} onChange={(e) => setPrecio(e.target.value)} className="rounded-lg border px-3 py-2" />
                <input type="number" placeholder="Valor de la seña" value={sena} onChange={(e) => setSena(e.target.value)} className="rounded-lg border px-3 py-2" />
                <button className="col-span-2 rounded-lg bg-primary py-2 font-semibold text-white">Agregar turno</button>
              </form>

              <div className="space-y-2">
                {turnos.map((t) => (
                  <div key={t.id} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span>{DIAS[t.dia_semana ?? 0]} · Cancha {t.numero_cancha}</span>
                    <span>{t.hora_inicio.slice(0, 5)} - {t.hora_fin.slice(0, 5)}{t.sena ? ` · Seña $${t.sena}` : ''}</span>
                  </div>
                ))}
                {turnos.length === 0 && <p className="text-sm text-gray-500">Todavía no cargaste turnos.</p>}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function EstadoBadge({ status }: { status: Cancha['status'] }) {
  const styles = {
    activa: 'bg-green-100 text-green-700',
    pausada: 'bg-red-100 text-red-700',
    pendiente: 'bg-amber-100 text-amber-700',
  }
  const labels = { activa: 'Activa', pausada: 'Pausada', pendiente: 'Pendiente de pago' }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>
}
