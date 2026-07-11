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

export interface ProgramaConfig {
  activo: boolean
  solesPorPunto: number
  puntosExpiranMeses?: number | null
  niveles: NivelFidel[]
  recompensas: RecompensaFidel[]
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
      puntosExpiranMeses: d?.puntosExpiranMeses ?? null,
      niveles: Array.isArray(d?.niveles) ? d.niveles : [],
      recompensas: Array.isArray(d?.recompensas) ? d.recompensas : [],
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
}
