import { apiClient } from './apiClient'

// El tenant (sede) viaja en el header X-Tenant-Subdomain (lo inyecta apiClient),
// así que ningún endpoint necesita idSede.

export interface NivelFidel {
  idNivel?: number
  nombre: string
  puntosMinimos: number
  orden: number
  color?: string
}

export interface RecompensaFidel {
  idRecompensa?: number
  nombre: string
  descripcion?: string
  puntosRequeridos: number
  activo: boolean
}

export interface PromocionFidel {
  idPromocion: number
  nombre: string
  /** Multiplicador de puntos (>= 1). Ej. 2 = doble puntaje. */
  multiplicador: number
  /** 0=domingo … 6=sábado. null = cualquier día. */
  diaSemana?: number | null
  fechaInicio?: string | null
  fechaFin?: string | null
  activo: boolean
  /** Calculado por el backend: si aplica hoy (hora Perú). */
  vigenteHoy?: boolean
}

/** Payload para crear/editar una promo (sin id ni vigenteHoy). */
export type GuardarPromocion = Omit<PromocionFidel, 'idPromocion' | 'vigenteHoy'>

export interface ProgramaConfig {
  activo: boolean
  solesPorPunto: number
  /** Multiplicador permanente del programa (1 = sin multiplicar). */
  multiplicadorBase: number
  puntosExpiranMeses?: number | null
  niveles: NivelFidel[]
  recompensas: RecompensaFidel[]
  /** Solo lectura aquí: las promos tienen su propio CRUD. */
  promociones?: PromocionFidel[]
}

export interface PreviewPuntos {
  programaActivo: boolean
  puntos: number
  multiplicador: number
  promocionAplicada?: string | null
}

export interface MovimientosPagina {
  items: MovimientoPuntos[]
  pagina: number
  tamanoPagina: number
  total: number
  hayMas: boolean
}

export interface MovimientoPuntos {
  fecha: string
  tipo: string
  puntos: number
  saldoResultante: number
  motivo?: string
}

export interface ProximaRecompensa {
  nombre: string
  puntosRequeridos: number
  puntosFaltantes: number
}

export interface Monedero {
  idMonedero: number
  idCliente: number
  nombreCliente?: string
  saldoPuntos: number
  puntosAcumHistorico: number
  nivelNombre?: string
  nivelColor?: string
  codigoQr: string
  proximaRecompensa?: ProximaRecompensa | null
  movimientos?: MovimientoPuntos[]
}

export interface RecompensaDisponible {
  idRecompensa: number
  nombre: string
  descripcion?: string
  puntosRequeridos: number
  canjeable: boolean
  puntosFaltantes: number
}

const unwrap = (res: any) => res?.data?.data ?? res?.data

export const fidelizacionService = {
  // --- Configuración (Admin) ---
  getConfig: async (): Promise<ProgramaConfig> => {
    const d = unwrap(await apiClient.get('/api/Fidelizacion/config'))
    return {
      activo: !!d?.activo,
      solesPorPunto: Number(d?.solesPorPunto ?? 1),
      multiplicadorBase: Number(d?.multiplicadorBase ?? 1),
      puntosExpiranMeses: d?.puntosExpiranMeses ?? null,
      niveles: Array.isArray(d?.niveles) ? d.niveles : [],
      recompensas: Array.isArray(d?.recompensas) ? d.recompensas : [],
      promociones: Array.isArray(d?.promociones) ? d.promociones : [],
    }
  },
  guardarConfig: async (cfg: ProgramaConfig): Promise<void> => {
    await apiClient.put('/api/Fidelizacion/config', cfg)
  },

  // --- Monedero del cliente ---
  getMonedero: async (idCliente: number): Promise<Monedero | null> => {
    const d = unwrap(await apiClient.get(`/api/Fidelizacion/cliente/${idCliente}`))
    return d ?? null
  },
  getRecompensas: async (idCliente: number): Promise<RecompensaDisponible[]> => {
    const d = unwrap(await apiClient.get(`/api/Fidelizacion/cliente/${idCliente}/recompensas`))
    return Array.isArray(d) ? d : []
  },
  getPorQr: async (codigo: string): Promise<Monedero | null> => {
    const d = unwrap(await apiClient.get(`/api/Fidelizacion/qr/${encodeURIComponent(codigo)}`))
    return d ?? null
  },
  canjear: async (idCliente: number, idRecompensa: number): Promise<Monedero> => {
    const d = unwrap(await apiClient.post('/api/Fidelizacion/canjear', { idCliente, idRecompensa }))
    return d
  },

  // --- Promociones (Admin) ---
  getPromociones: async (): Promise<PromocionFidel[]> => {
    const d = unwrap(await apiClient.get('/api/Fidelizacion/promociones'))
    return Array.isArray(d) ? d : []
  },
  crearPromocion: async (p: GuardarPromocion): Promise<PromocionFidel> =>
    unwrap(await apiClient.post('/api/Fidelizacion/promociones', p)),
  actualizarPromocion: async (id: number, p: GuardarPromocion): Promise<PromocionFidel> =>
    unwrap(await apiClient.put(`/api/Fidelizacion/promociones/${id}`, p)),
  eliminarPromocion: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/Fidelizacion/promociones/${id}`)
  },

  // --- Aviso de puntos antes de cerrar la venta ---
  preview: async (total: number): Promise<PreviewPuntos | null> => {
    try {
      const d = unwrap(await apiClient.post('/api/Fidelizacion/preview', { total }))
      return d ?? null
    } catch { return null }   // nunca romper el flujo de venta por el aviso
  },

  // --- Historial completo paginado ---
  getMovimientos: async (idCliente: number, pagina = 1, tamanoPagina = 20): Promise<MovimientosPagina> => {
    const d = unwrap(await apiClient.get(
      `/api/Fidelizacion/cliente/${idCliente}/movimientos?pagina=${pagina}&tamanoPagina=${tamanoPagina}`))
    return {
      items: Array.isArray(d?.items) ? d.items : [],
      pagina: Number(d?.pagina ?? pagina),
      tamanoPagina: Number(d?.tamanoPagina ?? tamanoPagina),
      total: Number(d?.total ?? 0),
      hayMas: !!d?.hayMas,
    }
  },
}
