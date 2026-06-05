import { apiClient } from './apiClient'

export interface MiSede {
  idSede: number
  idEmpresa: number
  nombre: string
  subdominio: string
  estado?: boolean
}

export const sedeTenantService = {
  /** Sedes de la empresa del admin logueado (resueltas por el JWT, sin tenant). */
  getMisSedes: async (): Promise<MiSede[]> => {
    const res = await apiClient.get('/api/Sedes/mias')
    const data = res.data.data ?? res.data
    return Array.isArray(data) ? data : []
  },
}
