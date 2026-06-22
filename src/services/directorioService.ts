import { apiClient } from '@/services/apiClient'

export interface DirectorioContacto {
  tipo: 'Admin' | 'Trabajador' | 'Cliente'
  id: number
  nombreCompleto?: string
  correo?: string
  telefono?: string
  ubicacion?: string
  activo?: boolean | null
}

export interface BuscarContactoResponse {
  query: string
  total: number
  resultados: DirectorioContacto[]
}

export interface DirectorioPagina {
  items: DirectorioContacto[]
  total: number
  pagina: number
  tamanoPagina: number
}

export interface DirectorioSede {
  idSede: number
  nombre: string
  empresa: string
}

const unwrap = <T>(res: any): T => (res.data?.data ?? res.data) as T

export const directorioService = {
  /** Buscador unificado: dónde aparece un correo/teléfono/nombre. */
  buscar: async (q: string): Promise<BuscarContactoResponse> => {
    const res = await apiClient.get('/api/superadmin/directorio/buscar', { params: { q } })
    return unwrap<BuscarContactoResponse>(res)
  },

  admins: async (buscar: string, pagina = 1, tamano = 20): Promise<DirectorioPagina> => {
    const res = await apiClient.get('/api/superadmin/directorio/admins', {
      params: { buscar: buscar || undefined, pagina, tamano },
    })
    return unwrap<DirectorioPagina>(res)
  },

  trabajadores: async (buscar: string, idSede: number | null, pagina = 1, tamano = 20): Promise<DirectorioPagina> => {
    const res = await apiClient.get('/api/superadmin/directorio/trabajadores', {
      params: { buscar: buscar || undefined, idSede: idSede || undefined, pagina, tamano },
    })
    return unwrap<DirectorioPagina>(res)
  },

  /** Clientes de una sede (los que han reservado ahí). idSede es obligatorio. */
  clientes: async (idSede: number, buscar: string, pagina = 1, tamano = 20): Promise<DirectorioPagina> => {
    const res = await apiClient.get('/api/superadmin/directorio/clientes', {
      params: { idSede, buscar: buscar || undefined, pagina, tamano },
    })
    return unwrap<DirectorioPagina>(res)
  },

  sedes: async (): Promise<DirectorioSede[]> => {
    const res = await apiClient.get('/api/superadmin/directorio/sedes')
    return unwrap<DirectorioSede[]>(res)
  },
}
