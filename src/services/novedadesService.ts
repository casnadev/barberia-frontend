import { apiClient } from './apiClient'

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface NovedadServicio {
  idServicio: number
  nombre: string
  precioBase: number
  duracionMinutos: number
}

export interface Novedad {
  idNovedad: number
  titulo: string
  cuerpo: string
  urlImagen?: string | null
  activo: boolean
  fechaCreacion: string

  tipo: string // Promo | Evento | Aviso
  fechaInicio?: string | null
  fechaExpiracion?: string | null
  destacado: boolean

  tipoAccion: string // Ninguna | Reservar | Enlace
  textoBoton?: string | null
  urlAccion?: string | null
  precioPromo?: number | null
  descuentoPorcentaje?: number | null
  servicios: NovedadServicio[]

  totalCorazones: number
  yoDiCorazon: boolean
  totalComentarios: number
  clicsAccion: number
  reservasAtribuidas?: number  // reservas que vinieron de la promo (solo en el listado admin)
}

export interface NovedadComentario {
  idComentario: number
  idComentarioPadre?: number | null
  nombreCliente: string
  urlFotoCliente?: string | null
  comentario: string
  urlImagen?: string | null
  tipoAdjunto?: string | null // Imagen | Sticker | Gif
  esRespuestaAdmin: boolean
  estadoModeracion: string
  fechaCreacion: string
  esMio: boolean
  respuestas: NovedadComentario[]
}

export interface CrearNovedadBody {
  titulo: string
  cuerpo: string
  urlImagen?: string
  tipo?: string
  fechaInicio?: string | null
  fechaExpiracion?: string | null
  destacado?: boolean
  tipoAccion?: string
  textoBoton?: string
  urlAccion?: string
  precioPromo?: number | null
  descuentoPorcentaje?: number | null
  idServicios?: number[]
}

export interface ComentarioReportado {
  idComentario: number
  idNovedad: number
  nombreCliente: string
  comentario: string
  urlImagen?: string | null
  estadoModeracion: string
  totalReportes: number
  fechaUltimoReporte: string
}

const data = (res: any) => res.data?.data ?? res.data

// ── Huella de dispositivo (para corazones/reportes anónimos) ─────────────────
const HUELLA_KEY = 'device_fp'
export const getHuellaDispositivo = (): string => {
  try {
    let h = localStorage.getItem(HUELLA_KEY)
    if (!h) {
      h = (crypto?.randomUUID?.() ?? `fp_${Date.now()}_${Math.random().toString(36).slice(2)}`).replace(/-/g, '')
      localStorage.setItem(HUELLA_KEY, h)
    }
    return h
  } catch {
    return `fp_${Date.now()}`
  }
}

export const novedadesService = {
  // ── ADMIN ────────────────────────────────────────────────────────────────
  listar: async (): Promise<Novedad[]> => data(await apiClient.get('/api/novedades')) ?? [],

  crear: async (body: CrearNovedadBody): Promise<Novedad> => data(await apiClient.post('/api/novedades', body)),

  editar: async (idNovedad: number, body: CrearNovedadBody): Promise<Novedad> =>
    data(await apiClient.put(`/api/novedades/${idNovedad}`, body)),

  cambiarActivo: async (idNovedad: number, activo: boolean) =>
    data(await apiClient.patch(`/api/novedades/${idNovedad}/activo?activo=${activo}`)),

  eliminar: async (idNovedad: number) => data(await apiClient.delete(`/api/novedades/${idNovedad}`)),

  /** Sube una imagen (comentario/flyer) y devuelve la ruta. Usa el upload legacy. */
  subirImagen: async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('Archivo', file)
    const res = await apiClient.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const d = data(res)
    return d?.url || d?.Url || ''
  },

  // ── CLIENTE / PÚBLICO ──────────────────────────────────────────────────────
  mias: async (): Promise<Novedad[]> => data(await apiClient.get('/api/novedades/mias')) ?? [],

  publicasPorSede: async (idSede: number): Promise<Novedad[]> =>
    data(await apiClient.get(`/api/novedades/publicas/${idSede}`)) ?? [],

  comentarios: async (idNovedad: number): Promise<NovedadComentario[]> =>
    data(await apiClient.get(`/api/novedades/${idNovedad}/comentarios`)) ?? [],

  /** Comentar con texto y/o adjunto (foto subida, sticker o gif) y respuesta a un padre. */
  comentar: async (
    idNovedad: number,
    body: { comentario?: string; urlImagen?: string; tipoAdjunto?: 'Imagen' | 'Sticker' | 'Gif'; idComentarioPadre?: number }
  ): Promise<NovedadComentario> => data(await apiClient.post(`/api/novedades/${idNovedad}/comentarios`, body)),

  eliminarComentario: async (idComentario: number) =>
    data(await apiClient.delete(`/api/novedades/comentarios/${idComentario}`)),

  /** Da/quita corazón (toggle). Devuelve { totalCorazones, yoDiCorazon }. */
  reaccionar: async (idNovedad: number): Promise<{ totalCorazones: number; yoDiCorazon: boolean }> =>
    data(await apiClient.post(`/api/novedades/${idNovedad}/corazon`, { huellaDispositivo: getHuellaDispositivo() })),

  /** Registra un clic en el botón "Lo quiero" (embudo). No bloquea si falla. */
  registrarClic: async (idNovedad: number) => {
    try { await apiClient.post(`/api/novedades/${idNovedad}/clic`) } catch { /* best-effort */ }
  },

  reportar: async (idComentario: number, motivo?: string) =>
    data(await apiClient.post(`/api/novedades/comentarios/${idComentario}/reportar`, {
      motivo,
      huellaDispositivo: getHuellaDispositivo(),
    })),

  // ── MODERACIÓN (ADMIN) ──────────────────────────────────────────────────────
  /** Comentarios con foto en revisión (Pendiente) de la sede actual. */
  listarPendientes: async (): Promise<NovedadComentario[]> =>
    data(await apiClient.get('/api/novedades/moderacion/pendientes')) ?? [],

  listarReportes: async (): Promise<ComentarioReportado[]> =>
    data(await apiClient.get('/api/novedades/moderacion/reportes')) ?? [],

  moderar: async (idComentario: number, estado: 'Aprobado' | 'Oculto' | 'Rechazado') =>
    data(await apiClient.post(`/api/novedades/comentarios/${idComentario}/moderar`, { estado })),

  responderAdmin: async (idNovedad: number, comentario: string, idComentarioPadre: number): Promise<NovedadComentario> =>
    data(await apiClient.post(`/api/novedades/${idNovedad}/responder`, { comentario, idComentarioPadre })),
}