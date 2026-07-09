import { apiClient } from './apiClient'

export interface ResumenComisiones {
  idTrabajador: number
  nombreTrabajador: string
  /** Ruta relativa de la foto del trabajador (avatar). */
  urlFotoPerfil?: string | null
  comisionesTotalCalculado: number
  comisionesTotalPagado: number
  comisionesTotalPendiente: number
  cantidadDetallesPendientes: number
}

/** Un pago recibido por el trabajador (historial). */
export interface PagoTrabajador {
  idPago: number
  idTrabajador: number
  nombreTrabajador: string
  urlFotoPerfil?: string | null
  fechaPago: string
  montoPagado: number
  metodoPago: string
  observacion?: string | null
  /** Ruta relativa de la foto de evidencia del pago (clickeable). */
  rutaImagenEvidencia?: string | null
  nombreUsuarioRegistra: string
}

export interface RegistrarPagoBody {
  idTrabajador: number
  montoPagado: number
  metodoPago: string
  observacion?: string
  /** Evidencia opcional (recomendada). Ruta relativa devuelta por subirEvidencia. */
  rutaImagenEvidencia?: string
}

/** Desempaqueta la respuesta estándar { data } de la API. */
const unwrap = (res: any) => res?.data?.data ?? res?.data

export const pagosService = {
  /** Comisiones por trabajador: calculado / pagado / pendiente. */
  getResumenComisiones: async (): Promise<ResumenComisiones[]> => {
    try {
      const res = await apiClient.get('/api/Pagos/resumen-comisiones')
      const data = unwrap(res)
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.error('❌ getResumenComisiones:', e)
      return []
    }
  },

  /** Historial de pagos recibidos por un trabajador (fecha, monto, método, evidencia). */
  getPagosTrabajador: async (
    idTrabajador: number,
    rango?: { desde?: string; hasta?: string },
  ): Promise<PagoTrabajador[]> => {
    try {
      const res = await apiClient.get(`/api/Pagos/trabajador/${idTrabajador}`, {
        params: { desde: rango?.desde, hasta: rango?.hasta },
      })
      const data = unwrap(res)
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.error('❌ getPagosTrabajador:', e)
      return []
    }
  },

  /**
   * Registra un pago al trabajador. Si no se envían detalles, el backend aplica
   * el monto FIFO sobre las comisiones pendientes (reduce el pendiente).
   */
  registrarPago: async (body: RegistrarPagoBody) => {
    const res = await apiClient.post('/api/Pagos', body)
    return unwrap(res)
  },

  /**
   * Sube la evidencia del pago al trabajador (módulo "pagos") y devuelve su
   * ruta RELATIVA (/uploads/pagos/xxx.webp), portable entre entornos.
   */
  subirEvidencia: async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('Archivo', file)
    const res = await apiClient.post('/api/upload/pagos', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const data = unwrap(res)
    return data?.url || data?.Url || ''
  },
}
