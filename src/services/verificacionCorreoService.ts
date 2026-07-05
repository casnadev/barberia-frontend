import { apiClient } from './apiClient'

export interface VerificacionResultado {
  nombre: string
  correo: string
}

export const verificacionCorreoService = {
  /** Confirma el correo con el token del enlace (público). */
  confirmar: async (token: string): Promise<VerificacionResultado> => {
    const res = await apiClient.post('/api/verificacion-correo/confirmar', { token })
    return res.data.data ?? res.data
  },

  /** Reenvía el correo de verificación (requiere sesión de Admin). */
  reenviar: async (): Promise<void> => {
    await apiClient.post('/api/verificacion-correo/enviar', {})
  },
}
