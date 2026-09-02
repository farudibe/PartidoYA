export type Rol = 'jugador' | 'cancha'
export type CanchaStatus = 'activa' | 'pausada' | 'pendiente'
export type ReservaStatus = 'señada' | 'confirmada' | 'cancelada' | 'completada'
export type MetodoPago = 'transferencia' | 'mercadopago'
export type PagoCuotaStatus = 'en_revision' | 'aprobado' | 'rechazado'
export type TipoCancha = 'futbol5' | 'futbol8' | 'futbol11'

export const TIPO_CANCHA_LABEL: Record<TipoCancha, string> = {
  futbol5: 'Fútbol 5',
  futbol8: 'Fútbol 8',
  futbol11: 'Fútbol 11',
}

export interface Profile {
  id: string
  role: Rol
  nombre: string
  telefono?: string | null
  // Fecha hasta la que dura la prueba gratuita de 30 días (solo dueños de cancha)
  trial_hasta?: string | null
  created_at?: string
}

export interface Cancha {
  id: string
  owner_id: string
  nombre: string
  direccion: string
  codigo_postal?: string | null
  provincia?: string | null
  descripcion?: string | null
  cantidad_canchas: number
  status: CanchaStatus
  alias_transferencia?: string | null
  mp_link_pago?: string | null
  fotos?: string[] | null
  created_at?: string
}

export interface CanchaCercana {
  id: string
  nombre: string
  direccion: string
  descripcion: string | null
  cantidad_canchas: number
  // null cuando la cancha viene de la búsqueda por nombre (no hay radio de referencia)
  distancia_km: number | null
  lat: number
  lng: number
  fotos?: string[] | null
}

// Provincias de Argentina, para el select del alta de cancha
export const PROVINCIAS_ARGENTINA = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
]

export interface CanchaPredio {
  id: string
  predio_id: string
  tipo: TipoCancha
  created_at?: string
}

export interface Turno {
  id: string
  cancha_id: string
  cancha_predio_id: string | null
  numero_cancha: number
  dia_semana: number | null
  fecha: string | null
  hora_inicio: string
  hora_fin: string
  precio: number | null
  sena: number | null
  activo: boolean
  // Presente cuando se pide el turno con el join a canchas_predio(tipo)
  canchas_predio?: { tipo: TipoCancha } | null
}

export interface Reserva {
  id: string
  turno_id: string
  jugador_id: string
  fecha: string
  status: ReservaStatus
  metodo_pago: MetodoPago | null
  nombre_cuenta_pagador: string | null
  comprobante_url: string | null
  created_at?: string
}

export interface TurnoOcupado {
  turno_id: string
  fecha: string
  status: ReservaStatus
}

export interface PagoCuota {
  id: string
  cancha_id: string
  nombre_cuenta_pagador: string
  comprobante_url: string
  status: PagoCuotaStatus
  created_at?: string
}

// Alias fijo de la plataforma PartidoYA para cobrar la cuota mensual
export const ALIAS_PARTIDOYA = 'partidoya'
