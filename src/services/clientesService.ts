import { apiClient } from './apiClient'

export interface Cliente {
  idCliente?: number
  telefono: string
  nombreCompleto: string
  correo?: string
  genero?: string
  cumpleaños?: string
  direccion?: string
  referencia?: string
  idEmpresa?: number
  registradoEn?: string
  activo?: boolean
  bloqueadoWeb?: boolean
  contadorNoShows?: number
  totalReservas?: number
  reservasAtendidas?: number
  ultimaVisita?: string
  ultimoLogin?: string
  fechaCreacion?: string
}

export interface ClientesPaginado {
  items: Cliente[]
  total: number
  pagina: number
  tamanoPagina: number
  totalPaginas: number
}

export const clientesService = {
  /**
   * Obtiene la lista de todos los clientes (paginado)
   * Los clientes se crean automáticamente cuando:
   * 1. Hacen una reserva (pre-registro)
   * 2. Se logean por OTP
   */
  getClientes: async (pagina: number = 1, tamanoPagina: number = 20, buscar?: string): Promise<Cliente[]> => {
    try {
      console.log('📥 Obteniendo lista de clientes...', { pagina, tamanoPagina, buscar })
      
      const params = new URLSearchParams()
      params.append('pagina', pagina.toString())
      params.append('tamanoPagina', tamanoPagina.toString())
      if (buscar) params.append('buscar', buscar)

      const res = await apiClient.get(`/api/Clientes?${params.toString()}`)
      
      console.log('📊 Respuesta del backend:', res.data)

      // El backend devuelve: { ok, data: { items, total, pagina, tamanoPagina, totalPaginas } }
      const data = res.data.data || res.data
      
      // Extraer items del objeto paginado
      if (data?.items && Array.isArray(data.items)) {
        console.log(`✅ Clientes obtenidos: ${data.items.length} de ${data.total} total`)
        return data.items
      }
      
      // Fallback si viene como array directo (compatibilidad)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('❌ Error getting clientes:', error)
      return []
    }
  },

  /**
   * Obtiene los detalles completos de un cliente específico
   */
  getClienteById: async (id: number): Promise<Cliente | null> => {
    try {
      console.log(`📥 Obteniendo detalles del cliente ${id}...`)
      const res = await apiClient.get(`/api/Clientes/${id}`)
      const cliente = res.data.data || res.data
      console.log('✅ Cliente obtenido:', cliente)
      return cliente || null
    } catch (error) {
      console.error('❌ Error:', error)
      return null
    }
  },

  /**
   * Actualiza los datos de un cliente existente
   * Solo para Admin
   */
  updateCliente: async (id: number, cliente: Partial<Cliente>) => {
    try {
      const payload = {
        telefono: cliente.telefono?.trim(),
        nombreCompleto: cliente.nombreCompleto?.trim(),
        correo: cliente.correo?.trim() || null,
        genero: cliente.genero?.trim() || null,
        cumpleaños: cliente.cumpleaños || null,
        direccion: cliente.direccion?.trim() || null,
        referencia: cliente.referencia?.trim() || null
      }

      console.log(`📤 Actualizando cliente ${id}:`, payload)
      const res = await apiClient.put(`/api/Clientes/${id}`, payload)
      console.log('✅ Respuesta del backend:', res.data)

      return res.data.data || res.data
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error)
      throw error
    }
  },

  /**
   * Desbloquea un cliente que fue bloqueado por no-shows
   * Reseta el contador de inasistencias
   */
  desbloquearCliente: async (id: number) => {
    try {
      console.log(`🔓 Desbloqueando cliente ${id}...`)
      const res = await apiClient.post(`/api/Clientes/${id}/desbloquear`, {})
      console.log('✅ Cliente desbloqueado:', res.data)
      return res.data.data || res.data
    } catch (error) {
      console.error('❌ Error desbloqueando cliente:', error)
      throw error
    }
  },

  /**
   * Nota: No hay endpoint para crear clientes manualmente
   * Los clientes se crean automáticamente cuando:
   * - Hacen una reserva (pre-registro por teléfono)
   * - Se logean por OTP
   */
}