export type Rol = 'jugador' | 'cancha'
export type CanchaStatus = 'activa' | 'pausada' | 'pendiente'
export type ReservaStatus = 'señada' | 'confirmada' | 'cancelada' | 'completada'
export type MetodoPago = 'transferencia' | 'mercadopago'
export type PagoCuotaStatus = 'en_revision' | 'aprobado' | 'rechazado'

export interface Profile {
  id: string
  role: Rol
  nombre: string
  telefono?: string | null
  created_at?: string
}

export interface Cancha {
  id: string
  owner_id: string
  nombre: string
  direccion: string
  descripcion?: string | null
  cantidad_canchas: number
  status: CanchaStatus
  alias_transferencia?: string | null
  mp_link_pago?: string | null
  created_at?: string
}

export interface CanchaCercana {
  id: string
  nombre: string
  direccion: string
  descripcion: string | null
  cantidad_canchas: number
  distancia_km: number
  lat: number
  lng: number
}

export interface Turno {
  id: string
  cancha_id: string
  numero_cancha: number
  dia_semana: number | null
  fecha: string | null
  hora_inicio: string
  hora_fin: string
  precio: number | null
  sena: number | null
  activo: boolean
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
