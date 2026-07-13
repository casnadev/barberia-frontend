import { apiClient } from './apiClient'

/**
 * Reseña destacada global, tal como la expone GET /api/Resenas/destacadas.
 * Se deriva de las calificaciones reales que dejan los clientes tras su cita.
 *
 * T1 — La identidad del autor es el NEGOCIO (la marca), no la sede. Antes este
 * DTO traía `ciudadSede` y la landing pintaba "nombreSede · ciudadSede", lo que
 * producía el absurdo "Miraflores · Miraflores" (la sede se llama igual que su
 * distrito). Ahora viajan `nombreComercial` y `totalSedesPublicasMarca`, y el
 * texto se compone SIEMPRE con utils/nombreParaMostrar.
 */
export interface ResenaDestacada {
  idCalificacion: number
  puntuacion: number
  comentario?: string | null
  fecha: string
  nombreCliente?: string | null
  idSede: number
  /** Zona/distrito del local (ej. "Miraflores"). */
  nombreSede: string
  /** La MARCA (ej. "Shanell Salón"). */
  nombreComercial: string
  subdominio: string
  slug: string
  /** ≥2 → "Marca – Sede". 1 → solo la marca. */
  totalSedesPublicasMarca: number
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
    nombreSede: r.nombreSede ?? r.NombreSede ?? '',
    nombreComercial: r.nombreComercial ?? r.NombreComercial ?? '',
    subdominio: r.subdominio ?? r.Subdominio ?? '',
    slug: r.slug ?? r.Slug ?? '',
    totalSedesPublicasMarca: Number(
      r.totalSedesPublicasMarca ?? r.TotalSedesPublicasMarca ?? 1,
    ),
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
