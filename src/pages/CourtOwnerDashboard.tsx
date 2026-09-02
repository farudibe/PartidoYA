import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { subirComprobante, subirFotosCancha } from '../lib/storage'
import { geocodeDireccion } from '../lib/geocoding'
import { useAuth } from '../contexts/AuthContext'
import { ALIAS_PARTIDOYA, PROVINCIAS_ARGENTINA, TIPO_CANCHA_LABEL } from '../types'
import type { Cancha, CanchaPredio, Turno, PagoCuota, TipoCancha } from '../types'

const MIN_FOTOS = 2

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function CourtOwnerDashboard() {
  const { user, profile, signOut } = useAuth()
  const [cancha, setCancha] = useState<Cancha | null>(null)
  const [ultimoPago, setUltimoPago] = useState<PagoCuota | null>(null)
  const [canchasPredio, setCanchasPredio] = useState<CanchaPredio[]>([])
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)

  // Formulario de alta de cancha
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [provincia, setProvincia] = useState('')
  // Por ahora cada predio tiene 1 sola cancha; si más adelante hace falta
  // manejar varias, se puede volver a exponer este campo en el formulario.
  const cantidadCanchas = 1
  const [aliasTransferencia, setAliasTransferencia] = useState('')
  const [mpLinkPago, setMpLinkPago] = useState('')
  const [fotos, setFotos] = useState<File[]>([])
  const [creandoCancha, setCreandoCancha] = useState(false)
  const [errorCancha, setErrorCancha] = useState<string | null>(null)

  // Formulario para agregar una cancha individual dentro del predio
  const [tipoNuevaCancha, setTipoNuevaCancha] = useState<TipoCancha>('futbol5')
  const [agregandoCanchaPredio, setAgregandoCanchaPredio] = useState(false)

  // Formulario de nuevo turno
  const [canchaPredioSeleccionada, setCanchaPredioSeleccionada] = useState('')
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
      const { data: canchasPredioData } = await supabase
        .from('canchas_predio')
        .select('*')
        .eq('predio_id', canchaData.id)
        .order('created_at')
      setCanchasPredio((canchasPredioData as CanchaPredio[]) ?? [])
      const { data: turnosData } = await supabase
        .from('turnos')
        .select('*, canchas_predio(tipo)')
        .eq('cancha_id', canchaData.id)
        .order('dia_semana')
      setTurnos((turnosData as Turno[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { cargarTodo() }, [user])

  // Si la cancha seleccionada para cargar turnos ya no existe (o todavía no
  // eligió ninguna), la seteamos a la primera disponible automáticamente.
  useEffect(() => {
    if (canchasPredio.length === 0) {
      setCanchaPredioSeleccionada('')
    } else if (!canchasPredio.some((c) => c.id === canchaPredioSeleccionada)) {
      setCanchaPredioSeleccionada(canchasPredio[0].id)
    }
  }, [canchasPredio])

  // Prueba gratuita de 30 días desde que el dueño se registró
  const trialActivo = !!profile?.trial_hasta && new Date(profile.trial_hasta) > new Date()
  const diasRestantesTrial = profile?.trial_hasta
    ? Math.max(0, Math.ceil((new Date(profile.trial_hasta).getTime() - Date.now()) / 86400000))
    : 0

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

  async function agregarCanchaPredio(e: React.FormEvent) {
    e.preventDefault()
    if (!cancha) return
    setAgregandoCanchaPredio(true)
    try {
      const { error } = await supabase.from('canchas_predio').insert({
        predio_id: cancha.id,
        tipo: tipoNuevaCancha,
      })
      if (!error) cargarTodo()
    } finally {
      setAgregandoCanchaPredio(false)
    }
  }

  async function agregarTurno(e: React.FormEvent) {
    e.preventDefault()
    if (!cancha || !canchaPredioSeleccionada) return
    const { error } = await supabase.from('turnos').insert({
      cancha_id: cancha.id,
      cancha_predio_id: canchaPredioSeleccionada,
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
                <EstadoBadge status={cancha.status} trialActivo={trialActivo} />
              </div>
              <p className="text-sm text-gray-500">{cancha.direccion}{cancha.provincia ? `, ${cancha.provincia}` : ''}</p>

              {cancha.fotos && cancha.fotos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {cancha.fotos.map((url, i) => (
                    <img key={i} src={url} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
                  ))}
                </div>
              )}

              {trialActivo && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                  🎁 Estás en tu <strong>prueba gratuita</strong>: te quedan <strong>{diasRestantesTrial} día{diasRestantesTrial === 1 ? '' : 's'}</strong>.
                  Mientras dure, tu predio ya aparece en el mapa de los jugadores aunque todavía no hayas pagado la cuota.
                </div>
              )}

              {cancha.status !== 'activa' && !trialActivo && (
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
              <h2 className="text-lg font-bold">Canchas del predio</h2>
              <p className="text-sm text-gray-500">Este predio puede tener más de una cancha. Agregalas acá antes de cargar turnos.</p>
              <form onSubmit={agregarCanchaPredio} className="flex gap-2">
                <select value={tipoNuevaCancha} onChange={(e) => setTipoNuevaCancha(e.target.value as TipoCancha)} className="flex-1 rounded-lg border px-3 py-2">
                  {(Object.keys(TIPO_CANCHA_LABEL) as TipoCancha[]).map((t) => (
                    <option key={t} value={t}>{TIPO_CANCHA_LABEL[t]}</option>
                  ))}
                </select>
                <button disabled={agregandoCanchaPredio} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {agregandoCanchaPredio ? 'Agregando...' : 'Agregar cancha'}
                </button>
              </form>
              <div className="flex flex-wrap gap-2">
                {canchasPredio.map((c, i) => (
                  <span key={c.id} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary-dark">
                    {TIPO_CANCHA_LABEL[c.tipo]} #{i + 1}
                  </span>
                ))}
                {canchasPredio.length === 0 && <p className="text-sm text-gray-500">Todavía no agregaste ninguna cancha.</p>}
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow space-y-4">
              <h2 className="text-lg font-bold">Turnos y horarios</h2>
              {canchasPredio.length === 0 ? (
                <p className="text-sm text-gray-500">Primero agregá al menos una cancha (Fútbol 5, 8 u 11) arriba para poder cargar turnos.</p>
              ) : (
                <form onSubmit={agregarTurno} className="grid grid-cols-2 gap-3">
                  <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))} className="rounded-lg border px-3 py-2">
                    {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <select value={canchaPredioSeleccionada} onChange={(e) => setCanchaPredioSeleccionada(e.target.value)} className="rounded-lg border px-3 py-2">
                    {canchasPredio.map((c, i) => (
                      <option key={c.id} value={c.id}>{TIPO_CANCHA_LABEL[c.tipo]} #{i + 1}</option>
                    ))}
                  </select>
                  <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="rounded-lg border px-3 py-2" />
                  <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="rounded-lg border px-3 py-2" />
                  <input type="number" placeholder="Valor total de la cancha" value={precio} onChange={(e) => setPrecio(e.target.value)} className="rounded-lg border px-3 py-2" />
                  <input type="number" placeholder="Valor de la seña" value={sena} onChange={(e) => setSena(e.target.value)} className="rounded-lg border px-3 py-2" />
                  <button className="col-span-2 rounded-lg bg-primary py-2 font-semibold text-white">Agregar turno</button>
                </form>
              )}

              <div className="space-y-2">
                {turnos.map((t) => (
                  <div key={t.id} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span>{DIAS[t.dia_semana ?? 0]} · {t.canchas_predio?.tipo ? TIPO_CANCHA_LABEL[t.canchas_predio.tipo] : 'Cancha'}</span>
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

function EstadoBadge({ status, trialActivo }: { status: Cancha['status']; trialActivo: boolean }) {
  if (status !== 'activa' && trialActivo) {
    return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">En prueba gratis</span>
  }
  const styles = {
    activa: 'bg-green-100 text-green-700',
    pausada: 'bg-red-100 text-red-700',
    pendiente: 'bg-amber-100 text-amber-700',
  }
  const labels = { activa: 'Activa', pausada: 'Pausada', pendiente: 'Pendiente de pago' }
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>
}
