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
/**
 * Desenvuelve la respuesta de la API.
 *
 * Antes:  `res?.data?.data ?? res?.data`
 *
 * Cuando el backend responde { exito: true, data: null }, el `??` veía
 * `data === null` y caía al fallback… devolviendo EL SOBRE ENTERO. El llamador
 * recibía `{exito:true, data:null}` —que es TRUTHY— en vez de `null`, y pintaba
 * la pantalla con todos los campos vacíos.
 *
 * Ahora: si el cuerpo TIENE la clave `data`, se devuelve su valor aunque sea null.
 * El fallback solo actúa con respuestas sin sobre.
 */
const unwrap = (res: any) => {
  const body = res?.data
  if (body && typeof body === 'object' && 'data' in body) return body.data
  return body
}

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
