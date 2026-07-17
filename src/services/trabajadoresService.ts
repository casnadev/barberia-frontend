import { apiClient } from './apiClient'

export interface Trabajador {
  idTrabajador: number
  nombreCompleto: string
  /** Nombre para la landing pública (para el dueño-admin, su nombre real). */
  nombrePublico?: string
  generaLiquidaciones?: boolean
  frecuenciaPago?: string
  metodoPagoPreferido?: string
  tipoRemuneracion?: string
  montoPagoFijo?: number | null
  telefono?: string
  correo?: string
  urlFotoPerfil?: string
  especializacion?: string
  estado: boolean
  /** TRUE = ficha del dueño (Admin). Usado para resolver "Venta mía". */
  esDuenoAdmin?: boolean
  accesoHabilitado?: boolean
  idSede?: number
  idEmpresa?: number
  comisionPorcentaje?: number
  fechaIngreso?: string
  /** Solo viene en la respuesta de CREAR: contraseña temporal para el primer ingreso. */
  passwordTemporal?: string
}

export interface Disponibilidad {
  idDisponibilidad?: number
  idTrabajador: number
  diaSemana: number // 0 = Lunes, 6 = Domingo
  horaInicio: string
  horaFin: string
  activa: boolean
}

export const trabajadoresService = {
  /**
   * Obtiene la lista de trabajadores de la sede actual
   */
  getTrabajadores: async (): Promise<Trabajador[]> => {
    try {
      console.log('📥 Obteniendo trabajadores...')
      const res = await apiClient.get('/api/Trabajadores')
      const data = res.data.data || res.data
      const trabajadores = Array.isArray(data) ? data : []
      console.log('✅ Trabajadores obtenidos:', trabajadores)
      return trabajadores
    } catch (error) {
      console.error('❌ Error getting trabajadores:', error)
      return []
    }
  },

  /**
   * Obtiene detalles de un trabajador específico
   */
  getTrabajadorById: async (id: number): Promise<Trabajador | null> => {
    try {
      console.log(`📥 Obteniendo detalles del trabajador ${id}...`)
      const res = await apiClient.get(`/api/Trabajadores/${id}`)
      const trabajador = res.data.data || res.data
      console.log('✅ Trabajador obtenido:', trabajador)
      return trabajador || null
    } catch (error) {
      console.error('❌ Error:', error)
      return null
    }
  },

  /**
   * Crea un nuevo trabajador
   */
  createTrabajador: async (trabajador: Partial<Trabajador>) => {
    try {
      console.log('📤 Creando trabajador:', trabajador)
      const res = await apiClient.post('/api/Trabajadores', trabajador)
      const created = res.data.data || res.data
      console.log('✅ Trabajador creado:', created)
      return created
    } catch (error) {
      console.error('❌ Error creando trabajador:', error)
      throw error
    }
  },

  /**
   * Actualiza los datos de un trabajador existente
   */
  updateTrabajador: async (id: number, trabajador: Partial<Trabajador>) => {
    try {
      console.log(`📤 Actualizando trabajador ${id}:`, trabajador)
      const res = await apiClient.put(`/api/Trabajadores/${id}`, trabajador)
      const updated = res.data.data || res.data
      console.log('✅ Trabajador actualizado:', updated)
      return updated
    } catch (error) {
      console.error('❌ Error actualizando trabajador:', error)
      throw error
    }
  },

  /**
   * Elimina un trabajador
   */
  deleteTrabajador: async (id: number) => {
    try {
      console.log(`🗑️ Eliminando trabajador ${id}...`)
      const res = await apiClient.delete(`/api/Trabajadores/${id}`)
      const result = res.data.data || res.data
      console.log('✅ Trabajador eliminado')
      return result
    } catch (error) {
      console.error('❌ Error eliminando trabajador:', error)
      throw error
    }
  },

  /**
   * Prende/apaga el acceso (login) de un trabajador. No envía nada: es un interruptor.
   * Al apagar, el backend corta sus sesiones activas al instante.
   */
  cambiarAcceso: async (id: number, habilitado: boolean): Promise<boolean> => {
    const res = await apiClient.put(`/api/Trabajadores/${id}/acceso`, { habilitado })
    const data = res.data?.data ?? res.data
    return data?.accesoHabilitado ?? habilitado
  },

  /**
   * Obtiene la disponibilidad semanal de un trabajador
   */
  getDisponibilidad: async (idTrabajador: number): Promise<Disponibilidad[]> => {
    try {
      console.log(`📥 Obteniendo disponibilidad del trabajador ${idTrabajador}...`)
      const res = await apiClient.get(`/api/Trabajadores/${idTrabajador}/disponibilidad`)
      const data = res.data.data || res.data
      const disponibilidad = Array.isArray(data) ? data : []
      console.log('✅ Disponibilidad obtenida:', disponibilidad)
      return disponibilidad
    } catch (error) {
      console.error('❌ Error:', error)
      return []
    }
  },

  /**
   * Actualiza la disponibilidad semanal de un trabajador
   */
  updateDisponibilidad: async (idTrabajador: number, disponibilidad: Disponibilidad[]) => {
    try {
      console.log(`📤 Actualizando disponibilidad del trabajador ${idTrabajador}:`, disponibilidad)
      const res = await apiClient.put(
        `/api/Trabajadores/${idTrabajador}/disponibilidad`,
        disponibilidad
      )
      const updated = res.data.data || res.data
      console.log('✅ Disponibilidad actualizada:', updated)
      return updated
    } catch (error) {
      console.error('❌ Error actualizando disponibilidad:', error)
      throw error
    }
  }
}