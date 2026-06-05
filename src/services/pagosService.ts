import { apiClient } from './apiClient'

export interface ResumenComisiones {
  idTrabajador: number
  nombreTrabajador: string
  comisionesTotalCalculado: number
  comisionesTotalPagado: number
  comisionesTotalPendiente: number
  cantidadDetallesPendientes: number
}

export interface RegistrarPagoBody {
  idTrabajador: number
  montoPagado: number
  metodoPago: string
  observacion?: string
}

export const pagosService = {
  /** Comisiones por trabajador: calculado / pagado / pendiente. */
  getResumenComisiones: async (): Promise<ResumenComisiones[]> => {
    try {
      const res = await apiClient.get('/api/Pagos/resumen-comisiones')
      const data = res.data?.data ?? res.data
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.error('❌ getResumenComisiones:', e)
      return []
    }
  },

  /**
   * Registra un pago al trabajador. Si no se envían detalles, el backend aplica
   * el monto FIFO sobre las comisiones pendientes (reduce el pendiente).
   */
  registrarPago: async (body: RegistrarPagoBody) => {
    const res = await apiClient.post('/api/Pagos', body)
    return res.data?.data ?? res.data
  },
}