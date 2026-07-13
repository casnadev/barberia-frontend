import { apiClient } from './apiClient'

export interface SolicitudDescanso {
  idDescanso: number
  idTrabajador: number
  idSede: number
  fechaInicio: string
  fechaFin: string
  tipo: string
  motivo?: string
  estado: 'Pendiente' | 'Aprobada' | 'Rechazada'
  motivoRechazo?: string | null
  nombreTrabajador?: string
  fechaCreacion?: string
}

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

/** Bandeja del Admin para las solicitudes de descanso/vacaciones de sus trabajadores (Tarea 5A). */
export const descansosAdminService = {
  listar: async (idSede: number, soloPendientes = false): Promise<SolicitudDescanso[]> => {
    const d = unwrap(await apiClient.get(`/api/Descanos/sede/${idSede}/solicitudes`, { params: { soloPendientes } }))
    return Array.isArray(d) ? d : []
  },
  pendientesCount: async (idSede: number): Promise<number> => {
    try { return Number(unwrap(await apiClient.get(`/api/Descanos/sede/${idSede}/pendientes-count`))) || 0 }
    catch { return 0 }
  },
  aprobar: async (idDescanso: number): Promise<void> => {
    await apiClient.post(`/api/Descanos/${idDescanso}/aprobar`, {})
  },
  rechazar: async (idDescanso: number, motivo?: string): Promise<void> => {
    await apiClient.post(`/api/Descanos/${idDescanso}/rechazar`, { motivo })
  },
}
