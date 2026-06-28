import { apiClient } from '@/services/apiClient'

export interface DirectorioContacto {
  tipo: 'Admin' | 'Trabajador' | 'Cliente'
  id: number
  nombreCompleto?: string
  correo?: string
  telefono?: string
  ubicacion?: string
  activo?: boolean | null
  /** Rol real cuando es una cuenta de login (Admin/Trabajador/SuperAdmin). Sirve para mostrar con honestidad los logins huérfanos. */
  rol?: string
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

export interface AltaRapidaRequest {
  nombreNegocio: string
  correo?: string
  telefono?: string
  nombreContacto?: string
}

export interface AltaRapidaResponse {
  idEmpresa: number
  idUsuario: number
  nombreNegocio: string
  correo?: string
  telefono?: string
  subdominio?: string
  otpEnviado: boolean
}

export const directorioService = {
  /** Alta rápida de negocio (un paso): nombre + contacto → Empresa + Admin + sede. */
  altaRapida: async (req: AltaRapidaRequest): Promise<AltaRapidaResponse> => {
    const res = await apiClient.post('/api/superadmin/altas', req)
    return unwrap<AltaRapidaResponse>(res)
  },

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

  /** Clientes que han reservado: en una sede (idSede) o en todas (idSede null). */
  clientes: async (idSede: number | null, buscar: string, pagina = 1, tamano = 20): Promise<DirectorioPagina> => {
    const res = await apiClient.get('/api/superadmin/directorio/clientes', {
      params: { idSede: idSede || undefined, buscar: buscar || undefined, pagina, tamano },
    })
    return unwrap<DirectorioPagina>(res)
  },

  sedes: async (): Promise<DirectorioSede[]> => {
    const res = await apiClient.get('/api/superadmin/directorio/sedes')
    return unwrap<DirectorioSede[]>(res)
  },

  /**
   * Da de baja un contacto: Admin, Trabajador o Cliente.
   * `campo` elige qué dar de baja:
   *   - 'correo'   → solo el correo
   *   - 'telefono' → solo el teléfono
   *   - 'todo'     → toda la cuenta (ambos)
   * Libera el/los dato(s) para que puedan registrarse de nuevo.
   * Devuelve el mensaje del backend (apto para mostrar en un toast).
   */
  eliminar: async (
    tipo: DirectorioContacto['tipo'],
    id: number,
    campo: 'correo' | 'telefono' | 'todo' = 'todo',
  ): Promise<string> => {
    const res = await apiClient.delete(`/api/superadmin/directorio/contacto/${tipo}/${id}`, {
      params: { campo },
    })
    const data = res.data ?? {}
    return data.mensaje ?? data.message ?? 'Contacto dado de baja.'
  },
}