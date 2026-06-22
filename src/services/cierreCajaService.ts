import { apiClient } from './apiClient'

export interface PreviewCierre {
  fecha: string
  montoSistemaEfectivo: number
  montoSistemaYape: number
  montoSistemaPlin: number
  montoSistemaOtros: number
  montoSistemaTotal: number
  cantidadVentas: number
  montoPendienteAprobacion?: number
  cantidadPendiente?: number
}

export interface CierreCaja {
  idCierre: number
  fechaCierre: string
  horaCierre: string
  nombreUsuarioCierra: string
  montoSistemaEfectivo: number
  montoSistemaYape: number
  montoSistemaPlin: number
  montoSistemaOtros: number
  montoSistemaTotal: number
  montoRealEfectivo: number
  montoRealYape: number
  montoRealPlin: number
  montoRealOtros: number
  montoRealTotal: number
  diferenciaTotal: number
  observacionDiferencia?: string
  cantidadVentas: number
}

export interface RegistrarCierreBody {
  fechaCierre: string
  montoRealEfectivo: number
  montoRealYape: number
  montoRealPlin: number
  montoRealOtros: number
  observacionDiferencia?: string
}

export const cierreCajaService = {
  /** Lo que el SISTEMA registró ese día, por método. */
  getPreview: async (fecha: string): Promise<PreviewCierre | null> => {
    try {
      const res = await apiClient.get(`/api/Cierres/preview?fecha=${fecha}`)
      return res.data?.data ?? res.data
    } catch (e) {
      console.error('❌ preview cierre:', e)
      return null
    }
  },

  /** Registra el cierre. El backend recalcula montos sistema y exige justificación si la diferencia ≥ S/ 0.50. */
  registrar: async (body: RegistrarCierreBody): Promise<CierreCaja> => {
    const res = await apiClient.post('/api/Cierres', body)
    return res.data?.data ?? res.data
  },

  /** Historial de cierres. */
  listar: async (desde?: string, hasta?: string): Promise<CierreCaja[]> => {
    try {
      const p = new URLSearchParams()
      if (desde) p.set('desde', desde)
      if (hasta) p.set('hasta', hasta)
      const qs = p.toString()
      const res = await apiClient.get(`/api/Cierres${qs ? `?${qs}` : ''}`)
      const d = res.data?.data ?? res.data
      return Array.isArray(d) ? d : []
    } catch (e) {
      console.error('❌ listar cierres:', e)
      return []
    }
  },
}