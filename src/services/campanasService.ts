import { apiClient } from './apiClient'

export interface CoberturaCampana {
  totalSegmento: number
  conCorreo: number
  sinCorreo: number
  cuotaRestante: number | null   // null = ilimitado
  seEnviaran: number
  cuotaInsuficiente: boolean
}

export interface ResultadoCampana {
  enviados: number
  fallidos: number
  sinCorreo: number
  omitidosPorCuota: number
  mensaje: string
}

const data = (r: any) => r?.data?.data ?? r?.data

export const campanasService = {
  /** Vista previa: a cuántos llega la promo por correo según el segmento (sin enviar). */
  cobertura: async (idNovedad: number, segmento?: string): Promise<CoberturaCampana> => {
    const params = new URLSearchParams({ idNovedad: String(idNovedad) })
    if (segmento) params.append('segmento', segmento)
    const r = await apiClient.get(`/api/campanas/cobertura?${params.toString()}`)
    return data(r) as CoberturaCampana
  },

  /** Envía la promo por correo al segmento (inmediato, respeta límites del plan). */
  enviar: async (idNovedad: number, segmento?: string): Promise<ResultadoCampana> => {
    const r = await apiClient.post('/api/campanas/enviar', { idNovedad, segmento: segmento || null })
    return data(r) as ResultadoCampana
  },
}
