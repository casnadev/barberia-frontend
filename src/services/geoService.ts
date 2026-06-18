import { apiClient } from './apiClient'

function errMsg(e: any, fallback: string): string {
  const d = e?.response?.data
  return d?.detail || d?.mensaje || d?.message || fallback
}

export const geoService = {
  /**
   * Resuelve coordenadas a partir de lo que el admin pega: "lat, lng",
   * un enlace largo de Google Maps, o un enlace corto (maps.app.goo.gl)
   * que el backend sigue para extraer las coordenadas.
   */
  resolver: async (
    texto: string,
  ): Promise<{ ok: boolean; lat?: number; lng?: number; mensaje?: string }> => {
    try {
      const r = await apiClient.post('/api/geo/resolver', { texto })
      const d = r.data?.data ?? r.data
      const lat = Number(d?.latitud)
      const lng = Number(d?.longitud)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { ok: false, mensaje: 'No pude leer la ubicación.' }
      }
      return { ok: true, lat, lng }
    } catch (e: any) {
      return { ok: false, mensaje: errMsg(e, 'No pude leer la ubicación.') }
    }
  },
}
