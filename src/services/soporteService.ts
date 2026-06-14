import { apiClient } from '@/services/apiClient'

export interface SoportePayload {
  motivo: string
  descripcion: string
  sedeNombre?: string
  subdominio?: string
  plan?: string
  nombre?: string
  rol?: string
  correo?: string
  telefono?: string
}

export const soporteService = {
  /** Envía un mensaje de soporte. Devuelve { ok, mensaje } leyendo el ApiResponse. */
  async enviar(payload: SoportePayload): Promise<{ ok: boolean; mensaje?: string }> {
    const res = await apiClient.post('/api/Soporte', payload)
    const d: any = res.data ?? {}
    return { ok: Boolean(d.ok ?? d.success ?? false), mensaje: d.mensaje ?? d.message }
  },
}