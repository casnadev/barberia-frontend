/**
 * Cliente REAL (tabla Clientes). Es la ÚNICA identidad válida para fidelización.
 *
 * OJO: `Cliente` (el de getClientes) viene de una vista agregada del CRM
 * (reservas + importados) y su idCliente NO identifica a nadie — puede ser un id de
 * bloqueo, 0 o negativo. Para acreditar puntos o abrir un monedero usa SIEMPRE esto.
 */
export interface ClienteReal {
  idCliente: number
  nombreCompleto?: string | null
  telefono: string
  correo?: string | null
}

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
  motivoBloqueoWeb?: string
  fechaBloqueoWeb?: string
  motivoSolicitudDesbloqueo?: string
  fechaSolicitudDesbloqueo?: string
  contadorNoShows?: number
  totalReservas?: number
  reservasAtendidas?: number
  ultimaVisita?: string
  ultimoLogin?: string
  fechaCreacion?: string
  segmento?: string   // "nuevo" | "frecuente" | "inactivo" | "riesgo" | "" (regular)
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
  getClientes: async (pagina: number = 1, tamanoPagina: number = 20, buscar?: string, idSede?: number | null, segmento?: string): Promise<Cliente[]> => {
    try {
      const params = new URLSearchParams()
      params.append('pagina', pagina.toString())
      params.append('tamanoPagina', tamanoPagina.toString())
      if (buscar) params.append('buscar', buscar)
      if (idSede && idSede > 0) params.append('idSede', idSede.toString())
      if (segmento) params.append('segmento', segmento)

      const res = await apiClient.get(`/api/Clientes?${params.toString()}`)

      // El backend devuelve: { ok, data: { items, total, pagina, tamanoPagina, totalPaginas } }
      const data = res.data.data || res.data

      if (data?.items && Array.isArray(data.items)) {
        return data.items
      }

      // Fallback si viene como array directo (compatibilidad)
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error getting clientes:', error)
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
  desbloquearCliente: async (id: number, motivo: string) => {
    try {
      console.log(`🔓 Desbloqueando cliente ${id}...`)
      const res = await apiClient.post(`/api/Clientes/${id}/desbloquear`, { motivo })
      console.log('✅ Cliente desbloqueado:', res.data)
      return res.data.data || res.data
    } catch (error) {
      console.error('❌ Error desbloqueando cliente:', error)
      throw error
    }
  },

  /**
   * El propio cliente bloqueado solicita la reactivación de su cuenta.
   * Anónimo: se identifica por su teléfono.
   */
  solicitarDesbloqueo: async (telefono: string, motivo: string) => {
    const res = await apiClient.post('/api/Clientes/solicitar-desbloqueo', { telefono, motivo })
    return res.data.data || res.data
  },

  /**
   * Importa una lista de clientes (estilo Fresha) a una sede del negocio.
   * Envía nombre, teléfono y correo. El backend crea los clientes y los vincula
   * a la sede, omitiendo los que ya existen (por teléfono o correo).
   * Devuelve { creados, omitidos }.
   */
  importarClientes: async (
    idSede: number,
    clientes: { nombre: string; telefono: string; correo: string }[],
  ): Promise<{ creados: number; omitidos: number }> => {
    const res = await apiClient.post('/api/Clientes/importar', { idSede, clientes })
    const data = res.data?.data ?? res.data ?? {}
    return { creados: data.creados ?? 0, omitidos: data.omitidos ?? 0 }
  },
  /** Busca clientes REALES por nombre, teléfono o correo (identidad para fidelización). */
  buscarReales: async (q: string, limite = 8): Promise<ClienteReal[]> => {
    try {
      const res = await apiClient.get(`/api/Clientes/buscar?q=${encodeURIComponent(q)}&limite=${limite}`)
      const d = res.data?.data ?? res.data
      return Array.isArray(d) ? d : []
    } catch { return [] }
  },

  /** Cliente REAL por teléfono exacto (null si no existe). */
  buscarRealPorTelefono: async (telefono: string): Promise<ClienteReal | null> => {
    try {
      const res = await apiClient.get(`/api/Clientes/real-por-telefono?telefono=${encodeURIComponent(telefono)}`)
      return res.data?.data ?? null
    } catch { return null }
  },
}
