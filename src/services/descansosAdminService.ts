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

const unwrap = (res: any) => res?.data?.data ?? res?.data

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
