import { apiClient } from './apiClient'

/**
 * Plan tal como lo expone GET /api/Planes/publicos. Los campos coinciden con
 * PlanPublicoDto del backend (que se alimenta de la tabla Planes).
 */
export interface PlanPublico {
  idPlan: number
  nombre: string
  descripcion?: string | null
  precioMensualPEN: number
  precioAnualPEN: number   // 0 = no ofrece plan anual
  esGratis: boolean
  limiteSedes: number
  limiteTrabajadores: number
  permiteWhatsApp: boolean
  permiteReportes: boolean
  popular: boolean
  caracteristicas: string[]
}

const normalizar = (raw: any): PlanPublico | null => {
  const p = raw ?? {}
  const id = p.idPlan ?? p.IdPlan
  if (id == null) return null
  return {
    idPlan: id,
    nombre: p.nombre ?? p.Nombre ?? 'Plan',
    descripcion: p.descripcion ?? p.Descripcion ?? null,
    precioMensualPEN: Number(p.precioMensualPEN ?? p.PrecioMensualPEN ?? 0),
    precioAnualPEN: Number(p.precioAnualPEN ?? p.PrecioAnualPEN ?? 0),
    esGratis: Boolean(p.esGratis ?? p.EsGratis ?? false),
    limiteSedes: Number(p.limiteSedes ?? p.LimiteSedes ?? 1),
    limiteTrabajadores: Number(p.limiteTrabajadores ?? p.LimiteTrabajadores ?? 1),
    permiteWhatsApp: Boolean(p.permiteWhatsApp ?? p.PermiteWhatsApp ?? false),
    permiteReportes: Boolean(p.permiteReportes ?? p.PermiteReportes ?? false),
    popular: Boolean(p.popular ?? p.Popular ?? false),
    caracteristicas: (p.caracteristicas ?? p.Caracteristicas ?? []).map((c: any) => String(c)),
  }
}

export const planesService = {
  /**
   * Lista los planes activos para la sección de precios. Degrada a [] si el
   * endpoint falla, para que la landing no se rompa.
   */
  getPublicos: async (): Promise<PlanPublico[]> => {
    try {
      const res = await apiClient.get('/api/Planes/publicos')
      const data = res.data?.data ?? res.data
      if (!Array.isArray(data)) return []
      return data
        .map(normalizar)
        .filter((p): p is PlanPublico => p != null)
        .sort((a, b) => a.precioMensualPEN - b.precioMensualPEN)
    } catch {
      return []
    }
  },
}