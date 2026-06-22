import { apiClient } from './apiClient'

/** Forma exacta del ClienteDto que devuelve el backend (GET /api/Clientes/{id}). */
export interface MiPerfil {
  idCliente: number
  telefono?: string | null
  nombreCompleto?: string | null
  correo?: string | null
  fechaNacimiento?: string | null
  genero?: string | null
  urlFotoPerfil?: string | null
  contadorNoShows?: number
  bloqueadoWeb?: boolean
  totalReservas?: number
  reservasAtendidas?: number
}

export interface ActualizarMiPerfilPayload {
  nombreCompleto?: string
  correo?: string
  telefono?: string
  fechaNacimiento?: string | null   // "YYYY-MM-DD"
  genero?: string
  urlFotoPerfil?: string            // ruta relativa devuelta por /api/upload ('' = quitar)
}

/**
 * Servicio del portal del cliente. Mapea 1:1 con los DTOs reales del backend
 * (a diferencia de clientesService.updateCliente, que manda campos que el
 * backend no tiene como 'cumpleaños'/'direccion').
 */
export const miCuentaService = {
  /** El cliente da de baja su propia cuenta (soft-delete; libera correo/teléfono). */
  darmeDeBaja: async () => {
    const res = await apiClient.post('/api/Clientes/darme-de-baja', {})
    return res.data
  },
  getMiPerfil: async (idCliente: number): Promise<MiPerfil | null> => {
    try {
      const res = await apiClient.get(`/api/Clientes/${idCliente}`)
      return (res.data?.data ?? res.data) || null
    } catch (error: any) {
      console.error('❌ getMiPerfil:', error.response?.status, error.message)
      return null
    }
  },

  actualizarMiPerfil: async (idCliente: number, payload: ActualizarMiPerfilPayload) => {
    // Solo enviamos campos definidos, con los nombres EXACTOS del ActualizarClienteRequest.
    const body: Record<string, unknown> = {}
    if (payload.nombreCompleto?.trim()) body.nombreCompleto = payload.nombreCompleto.trim()
    if (payload.correo?.trim()) body.correo = payload.correo.trim()
    if (payload.telefono?.trim()) body.telefono = payload.telefono.trim()
    if (payload.fechaNacimiento) body.fechaNacimiento = payload.fechaNacimiento
    if (payload.genero?.trim()) body.genero = payload.genero.trim()
    // La foto se manda siempre que venga definida (incluida cadena vacía = quitar).
    if (payload.urlFotoPerfil !== undefined) body.urlFotoPerfil = payload.urlFotoPerfil

    const res = await apiClient.put(`/api/Clientes/${idCliente}`, body)
    return res.data?.data ?? res.data
  },

  /** Sube una imagen a /api/upload y devuelve la ruta relativa para guardar en urlFotoPerfil. */
  subirFoto: async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('Archivo', file)
    const res = await apiClient.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const data = res.data?.data ?? res.data
    return data?.url || data?.Url || ''
  },

  /** Calificar una cita Atendida (POST /api/Clientes/calificaciones). Pide login. */
  crearCalificacion: async (idReserva: number, puntuacion: number, comentario?: string) => {
    const res = await apiClient.post('/api/Clientes/calificaciones', {
      idReserva,
      puntuacion,
      comentario: comentario?.trim() || undefined,
    })
    return res.data?.data ?? res.data
  },
}