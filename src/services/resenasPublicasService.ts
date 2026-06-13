import { apiClient } from './apiClient'

/**
 * Reseña destacada global, tal como la expone GET /api/Resenas/destacadas.
 * Se deriva de las calificaciones reales que dejan los clientes tras su cita.
 */
export interface ResenaDestacada {
  idCalificacion: number
  puntuacion: number
  comentario?: string | null
  fecha: string
  nombreCliente?: string | null
  idSede: number
  nombreSede: string
  subdominio: string
  ciudadSede?: string | null
}

const normalizar = (raw: any): ResenaDestacada | null => {
  const r = raw ?? {}
  const id = r.idCalificacion ?? r.IdCalificacion
  if (id == null) return null
  return {
    idCalificacion: id,
    puntuacion: Number(r.puntuacion ?? r.Puntuacion ?? 5),
    comentario: r.comentario ?? r.Comentario ?? null,
    fecha: r.fecha ?? r.Fecha ?? '',
    nombreCliente: r.nombreCliente ?? r.NombreCliente ?? null,
    idSede: Number(r.idSede ?? r.IdSede ?? 0),
    nombreSede: r.nombreSede ?? r.NombreSede ?? 'Barbería',
    subdominio: r.subdominio ?? r.Subdominio ?? '',
    ciudadSede: r.ciudadSede ?? r.CiudadSede ?? null,
  }
}

export const resenasPublicasService = {
  /**
   * Mejores reseñas de toda la plataforma. Degrada a [] si falla, para que la
   * sección de reseñas no rompa la landing.
   */
  getDestacadas: async (limite = 12): Promise<ResenaDestacada[]> => {
    try {
      const res = await apiClient.get('/api/Resenas/destacadas', { params: { limite } })
      const data = res.data?.data ?? res.data
      if (!Array.isArray(data)) return []
      return data.map(normalizar).filter((r): r is ResenaDestacada => r != null)
    } catch {
      return []
    }
  },
}