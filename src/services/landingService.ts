import { apiClient } from './apiClient'

/**
 * Datos mínimos de una sede pública para mostrarla como "barbería real"
 * en la landing. Se obtiene del endpoint anónimo /api/Sedes/publica/{subdominio}.
 */
export interface SedeDestacada {
  idSede: number
  nombre: string
  subdominio: string
  direccion?: string
  telefono?: string
  descripcion?: string
  logoUrl?: string
  portadaUrl?: string
  ciudad?: string
}

/**
 * Normaliza la respuesta del backend (que puede venir envuelta en { data })
 * a nuestra forma SedeDestacada, tolerando nombres de campos distintos.
 */
const normalizar = (raw: any, subdominio: string): SedeDestacada | null => {
  const s = raw?.data ?? raw
  if (!s || (!s.idSede && !s.IdSede)) return null
  return {
    idSede: s.idSede ?? s.IdSede,
    nombre: s.nombre ?? s.Nombre ?? 'Barbería',
    subdominio: s.subdominio ?? s.Subdominio ?? subdominio,
    direccion: s.direccion ?? s.Direccion,
    telefono: s.telefono ?? s.Telefono,
    descripcion: s.descripcionCorta ?? s.DescripcionCorta ?? s.descripcion ?? s.Descripcion,
    logoUrl: s.urlLogo ?? s.UrlLogo,
    portadaUrl: s.urlBanner ?? s.UrlBanner,
    ciudad: s.distrito ?? s.Distrito ?? s.provincia ?? s.Provincia,
  }
}

export const landingService = {
  /**
   * Intenta resolver una sede pública por subdominio. Devuelve null si no existe
   * o si el endpoint falla (la landing degrada de forma elegante).
   */
  getSedePublica: async (subdominio: string): Promise<SedeDestacada | null> => {
    try {
      const res = await apiClient.get(`/api/Sedes/publica/${subdominio}`)
      return normalizar(res.data, subdominio)
    } catch {
      return null
    }
  },

  /**
   * Lista TODAS las sedes activas para la vitrina/carrusel.
   * 1) Intenta el endpoint público de lista: GET /api/Sedes/publicas (recomendado;
   *    ver el snippet del LEEME para crearlo). Así las sedes nuevas aparecen solas.
   * 2) Si ese endpoint no existe aún (404), cae a resolver los subdominios conocidos
   *    uno por uno. La landing nunca se rompe.
   */
  getSedesPublicas: async (fallbackSubdominios: string[] = []): Promise<SedeDestacada[]> => {
    try {
      const res = await apiClient.get('/api/Sedes/publicas')
      const data = res.data?.data ?? res.data
      if (Array.isArray(data) && data.length) {
        return data
          .map((s: any) => normalizar(s, s?.subdominio ?? s?.Subdominio ?? ''))
          .filter((s): s is SedeDestacada => s != null)
      }
    } catch {
      /* el endpoint de lista no existe todavía: usamos el fallback */
    }
    return landingService.getSedesDestacadas(fallbackSubdominios)
  },

  /**
   * Resuelve en paralelo varias sedes por subdominio y devuelve sólo las que
   * existen. Pensado para la vitrina "barberías que ya usan barber.pe".
   */
  getSedesDestacadas: async (subdominios: string[]): Promise<SedeDestacada[]> => {
    const settled = await Promise.allSettled(
      subdominios.map((sd) => landingService.getSedePublica(sd))
    )
    return settled
      .filter(
        (r): r is PromiseFulfilledResult<SedeDestacada | null> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value)
      .filter((s): s is SedeDestacada => s != null)
  },
}