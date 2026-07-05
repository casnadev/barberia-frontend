import { apiClient } from './apiClient'

export interface ServicioPredeterminado {
  clave: string
  nombre: string
  descripcionCorta: string
  precio: number
  duracionMinutos: number
  icono: string
  destacado: boolean
  yaExiste: boolean
}

export interface CategoriaPredeterminada {
  clave: string
  nombre: string
  descripcion: string
  icono: string
  servicios: ServicioPredeterminado[]
}

export interface CargarPredeterminadosResultado {
  categoriasCreadas: number
  serviciosCreados: number
  serviciosOmitidos: number
}

export const serviciosService = {
  getServicios: async (idSede?: number) => {
    const res = await apiClient.get('/api/Servicios', { params: { idSede } })
    return res.data.data || []
  },

  // Bloque 3 — catálogo de servicios predeterminados (picker del panel).
  getPredeterminados: async (): Promise<CategoriaPredeterminada[]> => {
    const res = await apiClient.get('/api/Servicios/predeterminados')
    const data = res.data.data ?? res.data
    return Array.isArray(data?.categorias) ? data.categorias : []
  },

  cargarPredeterminados: async (
    claves: string[],
  ): Promise<CargarPredeterminadosResultado> => {
    const res = await apiClient.post('/api/Servicios/predeterminados', { claves })
    return res.data.data ?? res.data
  },
}
