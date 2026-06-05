import { apiClient } from './apiClient'

export interface MiEmpresa {
  idEmpresa: number
  razonSocial: string
  nombreComercial: string
  ruc?: string
  correoContacto?: string
  telefonoContacto?: string
}

export interface MiPerfil {
  idUsuario: number
  nombreCompleto: string
  correo?: string
  telefono?: string
  urlFotoPerfil?: string | null
  rol: string
}

export const perfilService = {
  /** Datos del Admin logueado (su Usuario). */
  getMiPerfil: async (): Promise<MiPerfil> => {
    const res = await apiClient.get('/api/auth/mi-perfil')
    return res.data.data ?? res.data
  },

  updateMiPerfil: async (data: { nombreCompleto: string; correo?: string; telefono?: string; urlFotoPerfil?: string }) => {
    const res = await apiClient.put('/api/auth/mi-perfil', data)
    return res.data.data ?? res.data
  },

  /** Sube una imagen a /api/upload y devuelve la ruta relativa para guardar en urlFotoPerfil. */
  subirFoto: async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('Archivo', file)
    const res = await apiClient.post('/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const data = res.data?.data ?? res.data
    return data?.url || data?.Url || ''
  },

  /** Empresa del Admin logueado. */
  getMiEmpresa: async (): Promise<MiEmpresa> => {
    const res = await apiClient.get('/api/mi-empresa')
    return res.data.data ?? res.data
  },

  updateMiEmpresa: async (data: {
    razonSocial: string; nombreComercial: string
    ruc?: string; correoContacto?: string; telefonoContacto?: string
  }) => {
    const res = await apiClient.put('/api/mi-empresa', data)
    return res.data.data ?? res.data
  },
}