import { apiClient } from './apiClient'

// Programa de referidos B2B (solo SuperAdmin). Cada llamada degrada con
// mensaje claro para que el panel no se rompa.

export interface ConfiguracionReferidos {
  descuentoNuevaPEN: number
  descuentoReferidorPEN: number
  activo: boolean
  maxReferidosPorEmpresa: number
}

export interface Referido {
  idReferido: number
  idEmpresaReferidora: number
  nombreReferidora?: string | null
  idEmpresaReferida: number
  nombreReferida?: string | null
  codigoUsado: string
  estado: string // Pendiente | Confirmado | Anulado
  fechaRegistro: string
  fechaConfirmacion?: string | null
  descuentoNuevaAplicadoPEN: number
  descuentoReferidorAplicadoPEN: number
}

const data = (r: any) => r?.data?.data ?? r?.data

export const referidosService = {
  getConfig: async (): Promise<ConfiguracionReferidos> => {
    const r = await apiClient.get('/api/superadmin/referidos/config')
    return data(r) as ConfiguracionReferidos
  },

  guardarConfig: async (cfg: ConfiguracionReferidos): Promise<void> => {
    await apiClient.put('/api/superadmin/referidos/config', cfg)
  },

  listar: async (estado?: string): Promise<Referido[]> => {
    const q = estado ? `?estado=${encodeURIComponent(estado)}` : ''
    const r = await apiClient.get(`/api/superadmin/referidos${q}`)
    return (data(r) ?? []) as Referido[]
  },
}
