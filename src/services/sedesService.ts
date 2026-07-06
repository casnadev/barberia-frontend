import { apiClient } from './apiClient'

export interface Sede {
  idSede: number
  nombre: string
  subdominio?: string
  empresa?: {
    idEmpresa: number
    nombre: string
  }
  direccion?: string
  telefono?: string
  correo?: string
  horarioApertura?: string
  horarioCierre?: string
  urlLogo?: string
  urlBanner?: string
  colorPrimarioHex?: string
  mostrarTelefonoEnLanding?: boolean
}

export interface SedePublica {
  idSede: number
  nombre: string
  subdominio: string
  slugMarca?: string
  slug?: string
  totalSedesPublicasMarca?: number
  direccion?: string
  telefono?: string
  correo?: string
  descripcion?: string
}

// Sede de fallback para desarrollo
const SEDE_FALLBACK: Sede = {
  idSede: 1,
  nombre: 'Barbería Demo',
  subdominio: 'demo',
  direccion: 'Calle Demo 123',
  telefono: '+51 987 654 321',
  correo: 'demo@barber.pe'
}

export const sedesService = {
  /**
   * Obtiene la sede actual del usuario logueado (por subdominio)
   * Si falla, usa una sede de fallback para desarrollo
   */
  getSedeActual: async (): Promise<Sede | null> => {
    try {
      console.log('📥 Obteniendo sede actual...')
      
      const token = localStorage.getItem('token')
      console.log('🔐 Token disponible:', !!token)
      
      if (!token) {
        console.warn('⚠️ No hay token, usando fallback...')
        return SEDE_FALLBACK
      }

      try {
        const res = await apiClient.get('/api/Sedes/actual')
        const sede = res.data.data || res.data
        console.log('✅ Sede actual obtenida:', sede)
        return sede || null
      } catch (err: any) {
        console.error('❌ Error en GET /api/Sedes/actual:', err.message)
        
        if (err.response?.status === 401) {
          console.error('⚠️ Error 401: Unauthorized. Token inválido.')
          return null
        }
        
        if (err.response?.status === 404) {
          console.warn('⚠️ Error 404: Sede no encontrada. Usando fallback...')
          return SEDE_FALLBACK
        }
        
        // Cualquier otro error, usa fallback
        console.warn('⚠️ Error desconocido. Usando fallback...')
        return SEDE_FALLBACK
      }
    } catch (error: any) {
      console.error('❌ Error crítico en getSedeActual:', error.message)
      return SEDE_FALLBACK
    }
  },

  /**
   * Obtiene la información pública de una sede por subdominio (sin autenticación)
   */
  getSedePublica: async (subdominio: string): Promise<SedePublica | null> => {
    try {
      console.log(`📥 Obteniendo sede pública: ${subdominio}...`)
      const res = await apiClient.get(`/api/Sedes/publica/${subdominio}`)
      const sede = res.data.data || res.data
      console.log('✅ Sede pública:', sede)
      return sede || null
    } catch (error) {
      console.error('❌ Error:', error)
      return null
    }
  },

  /**
   * Obtiene la sede pública por Id (sin autenticación). Lo usa la landing al
   * abrir /sede/{id} desde el dominio raíz (barber.pe), donde no hay un
   * subdominio real que resolver en el host.
   */
  getSedePublicaPorId: async (idSede: number): Promise<SedePublica | null> => {
    try {
      const res = await apiClient.get(`/api/Sedes/${idSede}/publica`)
      const sede = res.data.data || res.data
      return sede || null
    } catch (error) {
      console.error('❌ Error obteniendo sede por id:', error)
      return null
    }
  },

  /**
   * Obtiene lista de todas las sedes (solo SuperAdmin)
   */
  getSedes: async (): Promise<Sede[]> => {
    try {
      console.log('📥 Obteniendo lista de sedes...')
      const res = await apiClient.get('/api/Sedes')
      const data = res.data.data || res.data
      const sedes = Array.isArray(data) ? data : []
      console.log('✅ Sedes obtenidas:', sedes)
      return sedes
    } catch (error) {
      console.error('❌ Error:', error)
      return []
    }
  },

  /**
   * Actualiza la sede actual
   */
  updateSedeActual: async (sede: Partial<Sede>) => {
    try {
      console.log('📤 Actualizando sede actual:', sede)
      const res = await apiClient.put('/api/Sedes/actual', sede)
      const updated = res.data.data || res.data
      console.log('✅ Sede actualizada:', updated)
      return updated
    } catch (error) {
      console.error('❌ Error actualizando sede:', error)
      throw error
    }
  },

  /**
   * Obtiene servicios de la sede actual
   */
  getServicios: async () => {
    try {
      console.log('📥 Obteniendo servicios...')
      const res = await apiClient.get('/api/Servicios')
      const data = res.data.data || res.data
      const servicios = Array.isArray(data) ? data : []
      console.log('✅ Servicios:', servicios)
      return servicios
    } catch (error) {
      console.error('❌ Error:', error)
      return []
    }
  },

  /**
   * Obtiene servicios públicos de una sede por subdominio
   */
  getServiciosPublicos: async (subdominio: string) => {
    try {
      console.log(`📥 Obteniendo servicios públicos de ${subdominio}...`)
      const res = await apiClient.get(`/api/Servicios?subdominio=${subdominio}`)
      const data = res.data.data || res.data
      const servicios = Array.isArray(data) ? data : []
      console.log('✅ Servicios públicos:', servicios)
      return servicios
    } catch (error) {
      console.error('❌ Error:', error)
      return []
    }
  },

  /**
   * Obtiene trabajadores de la sede actual
   */
  getTrabajadores: async () => {
    try {
      console.log('📥 Obteniendo trabajadores...')
      const res = await apiClient.get('/api/Trabajadores')
      const data = res.data.data || res.data
      const trabajadores = Array.isArray(data) ? data : []
      console.log('✅ Trabajadores:', trabajadores)
      return trabajadores
    } catch (error) {
      console.error('❌ Error obteniendo trabajadores:', error)
      return []
    }
  },

  /**
   * Obtiene trabajadores públicos de una sede por subdominio
   */
  getTrabajadoresPublicos: async (subdominio: string) => {
    try {
      console.log(`📥 Obteniendo trabajadores públicos de ${subdominio}...`)
      const res = await apiClient.get(`/api/Trabajadores?subdominio=${subdominio}`)
      const data = res.data.data || res.data
      const trabajadores = Array.isArray(data) ? data : []
      console.log('✅ Trabajadores públicos:', trabajadores)
      return trabajadores
    } catch (error) {
      console.error('❌ Error:', error)
      return []
    }
  },

  /**
   * Obtiene disponibilidad de un trabajador
   */
  getDisponibilidad: async (idTrabajador: number) => {
    try {
      console.log(`📥 Obteniendo disponibilidad del trabajador ${idTrabajador}...`)
      const res = await apiClient.get(`/api/Trabajadores/${idTrabajador}/disponibilidad`)
      const data = res.data.data || res.data
      console.log('✅ Disponibilidad:', data)
      return data
    } catch (error) {
      console.error('❌ Error:', error)
      return null
    }
  }
}