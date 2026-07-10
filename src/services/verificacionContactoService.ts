import { apiClient } from './apiClient'

/**
 * Verificación EN LA APP del correo y teléfono del usuario logueado (Admin,
 * SuperAdmin o Trabajador) por código OTP, y la "Llave de Acceso" del Admin
 * sobre un trabajador (Tarea 2). El teléfono usa WhatsApp; el correo, email.
 */
export const verificacionContactoService = {
  // ---- Teléfono (WhatsApp) ----
  enviarTelefono: async (): Promise<void> => {
    await apiClient.post('/api/verificacion-contacto/telefono/enviar', {})
  },
  confirmarTelefono: async (codigo: string): Promise<void> => {
    await apiClient.post('/api/verificacion-contacto/telefono/confirmar', { codigo })
  },

  // ---- Correo (código) ----
  enviarCorreo: async (): Promise<void> => {
    await apiClient.post('/api/verificacion-contacto/correo/enviar', {})
  },
  confirmarCorreo: async (codigo: string): Promise<void> => {
    await apiClient.post('/api/verificacion-contacto/correo/confirmar', { codigo })
  },

  /**
   * Llave de Acceso (Admin/SuperAdmin): habilita al trabajador y le envía un
   * código para crear/recuperar su contraseña. Devuelve el mensaje del backend.
   */
  enviarAccesoTrabajador: async (idTrabajador: number): Promise<string> => {
    const res = await apiClient.post(`/api/Trabajadores/${idTrabajador}/enviar-acceso`, {})
    return res.data?.mensaje ?? res.data?.message ?? 'Código de acceso enviado.'
  },
}
