import { apiClient } from './apiClient'

export interface Reserva {
  id?: number
  idReserva?: number
  nombreClienteSnap?: string
  nombreCliente?: string
  telefonoClienteSnap?: string
  telefonoCliente?: string
  correoClienteSnap?: string
  nombreTrabajador?: string
  nombreTrabajadorSnap?: string
  horaInicio?: string
  horaFin?: string
  estado?: string
  /** Motivo de cancelación (interno: solo Admin y el trabajador dueño de la cita). */
  motivoCancelacion?: string | null
  fechaCancelacion?: string | null
  estadoPago?: string   // PendienteAprobacion | Registrada | Rechazada | Anulada | undefined (sin cobrar)
  idTrabajador?: number
  idServicio?: number
  idSede?: number
  fechaReserva: string
  precioServicioSnap?: number
  idServicios?: number[]
  /** Multi-servicio (viene de ListarAsync). */
  precioServicio?: number
  duracionMinutos?: number
  servicios?: { idServicio: number; nombre: string; precio: number; duracionMinutos: number; orden: number }[]
}

/**
 * Forma que devuelve el backend en ReservaResumenDto (camelCase).
 * Es lo que retornan tanto GET /api/Reservas como GET /api/Reservas/mias.
 */
export interface ReservaResumen {
  idReserva: number
  fechaReserva: string        // "2026-05-31"
  horaInicio: string          // "10:00:00"
  horaFin: string             // "10:30:00"
  estado: string              // Pendiente | Confirmada | Atendida | Cancelada | NoShow
  origen?: string
  nombreCliente?: string
  telefonoCliente?: string
  correoCliente?: string
  idTrabajador?: number
  nombreTrabajador?: string
  fotoTrabajador?: string | null
  idServicio?: number
  nombreServicio?: string
  precioServicio?: number
  duracionMinutos?: number
  fechaConfirmacion?: string | null
  fechaCancelacion?: string | null
  motivoCancelacion?: string | null
  nombreSede?: string | null      // estilo Fresha: en qué sede fue la cita
  tokenCliente?: string | null    // para confirmar/cancelar/reprogramar por token
  idSede?: number                 // para el link "Ver barbería" por cita
  yaCalificada?: boolean          // si ya dejó reseña en esta cita
  subdominio?: string | null    // subdominio de la sede (para "Ver sitio" del cliente)
  puntuacion?: number | null      // estrellas que dejó (si yaCalificada)
}

export interface PaginacionResponse<T> {
  items: T[]
  total: number
  pagina: number
  porPagina: number
  totalPaginas: number
}

export const reservasService = {
  /**
   * Obtiene reservas con filtros opcionales
   */
  getReservas: async (desde?: string, hasta?: string, estado?: string, idTrabajador?: number | null): Promise<Reserva[]> => {
    try {
      console.log('📥 Obteniendo reservas...', { desde, hasta, estado, idTrabajador })

      const params = new URLSearchParams()
      if (desde) params.append('desde', desde)
      if (hasta) params.append('hasta', hasta)
      if (estado) params.append('estado', estado)
      if (idTrabajador) params.append('idTrabajador', String(idTrabajador))

      const url = `/api/Reservas${params.toString() ? '?' + params.toString() : ''}`
      console.log('🔗 URL final:', url)

      const res = await apiClient.get(url)
      
      console.log('📊 Respuesta completa:', res.data)

      let data = res.data.data

      if (!data) {
        console.warn('⚠️ No hay campo "data" en respuesta')
        return []
      }

      // Si es un objeto con items (paginado)
      if (data.items && Array.isArray(data.items)) {
        console.log(`✅ Reservas obtenidas (paginado): ${data.items.length} de ${data.total}`)
        return data.items
      }

      // Si es directamente un array
      if (Array.isArray(data)) {
        console.log(`✅ Reservas obtenidas (array directo): ${data.length}`)
        return data
      }

      console.warn('⚠️ Estructura de respuesta inesperada:', data)
      return []

    } catch (error: any) {
      console.error('❌ Error getting reservas:', error.message)
      console.error('Status:', error.response?.status)
      console.error('Response:', error.response?.data)
      return []
    }
  },

  /**
   * Obtiene una reserva específica
   */
  getReservaById: async (id: number): Promise<Reserva | null> => {
    try {
      console.log(`📥 Obteniendo reserva ${id}...`)
      const res = await apiClient.get(`/api/Reservas/${id}`)
      const reserva = res.data.data || res.data
      console.log('✅ Reserva obtenida:', reserva)
      return reserva || null
    } catch (error: any) {
      console.error('❌ Error:', error.message)
      return null
    }
  },

  /**
   * Crea una nueva reserva
   */
  createReserva: async (reserva: Partial<Reserva>) => {
    try {
      console.log('📤 Creando reserva:', reserva)
      const res = await apiClient.post('/api/Reservas', reserva)
      const created = res.data.data || res.data
      console.log('✅ Reserva creada:', created)
      return created
    } catch (error: any) {
      console.error('❌ Error creando reserva:', error.message)
      throw error
    }
  },

  /**
   * Confirma una reserva
   */
  confirmarReserva: async (id: number) => {
    try {
      console.log(`📤 Confirmando reserva ${id}...`)
      const res = await apiClient.post(`/api/Reservas/${id}/confirmar`, {})
      const updated = res.data.data || res.data
      console.log('✅ Reserva confirmada:', updated)
      return updated
    } catch (error: any) {
      console.error('❌ Error confirmando reserva:', error.message)
      throw error
    }
  },

  /**
   * Cancela una reserva
   */
  cancelarReserva: async (id: number, motivo?: string) => {
    try {
      console.log(`📤 Cancelando reserva ${id}...`)
      const res = await apiClient.post(`/api/Reservas/${id}/cancelar`, { motivo })
      const updated = res.data.data || res.data
      console.log('✅ Reserva cancelada:', updated)
      return updated
    } catch (error: any) {
      console.error('❌ Error cancelando reserva:', error.message)
      throw error
    }
  },

  /**
   * Marca una reserva como atendida
   */
  marcarAtendida: async (id: number) => {
    try {
      console.log(`📤 Marcando reserva ${id} como atendida...`)
      const res = await apiClient.post(`/api/Reservas/${id}/atender`, {})
      const updated = res.data.data || res.data
      console.log('✅ Reserva atendida:', updated)
      return updated
    } catch (error: any) {
      console.error('❌ Error:', error.message)
      throw error
    }
  },

  /**
   * Obtiene slots disponibles para un trabajador (o "máxima disponibilidad"
   * si idTrabajador = 0). Si se pasan idServicios, los huecos se calculan con
   * la SUMA de sus duraciones.
   */
  getSlotsDisponibles: async (
    idTrabajador: number,
    fecha: string,
    idServicios?: number | number[],
  ) => {
    try {
      console.log(`📥 Obteniendo slots para trabajador ${idTrabajador} en ${fecha}...`)

      const params = new URLSearchParams()
      params.append('idTrabajador', idTrabajador.toString())
      params.append('fecha', fecha)

      const lista =
        idServicios == null ? [] : Array.isArray(idServicios) ? idServicios : [idServicios]
      lista
        .filter((id) => id > 0)
        .forEach((id) => params.append('idServicios', id.toString()))

      const res = await apiClient.get(`/api/Reservas/slots-disponibles?${params.toString()}`)
      const data = res.data.data || res.data
      const slots = Array.isArray(data) ? data : []
      console.log('✅ Slots disponibles:', slots)
      return slots
    } catch (error: any) {
      console.error('❌ Error:', error.message)
      return []
    }
  },

  /**
   * Reservas del CLIENTE logueado (dashboard cliente).
   * Requiere el endpoint backend: GET /api/Reservas/mias  [Authorize(Roles="Cliente")]
   * Devuelve [] ante cualquier error (p.ej. si el endpoint aún no está desplegado),
   * para que el dashboard muestre estado vacío en lugar de romperse.
   */
  getMisReservas: async (): Promise<ReservaResumen[]> => {
    try {
      console.log('📥 Obteniendo MIS reservas (cliente)...')
      const res = await apiClient.get('/api/Reservas/mias')
      const data = res.data?.data ?? res.data
      if (Array.isArray(data)) {
        console.log(`✅ Mis reservas: ${data.length}`)
        return data
      }
      if (data?.items && Array.isArray(data.items)) return data.items
      console.warn('⚠️ Estructura inesperada en mis-reservas:', data)
      return []
    } catch (error: any) {
      console.error('❌ Error getMisReservas:', error.response?.status, error.message)
      return []
    }
  },

  // ---- Acciones del cliente sobre SU cita (por token, cross-sede) ----------
  // El backend ya carga la reserva con IgnoreQueryFilters, así que funciona
  // aunque la cita sea de otra sede que la del subdominio actual.

  obtenerPorToken: async (token: string) => {
    const res = await apiClient.get(`/api/Reservas/token/${encodeURIComponent(token)}`)
    return res.data?.data ?? res.data
  },
  confirmarPorToken: async (token: string) => {
    const res = await apiClient.post(`/api/Reservas/token/${encodeURIComponent(token)}/confirmar`, {})
    return res.data?.data ?? res.data
  },

  cancelarPorToken: async (token: string, motivo?: string) => {
    const res = await apiClient.post(`/api/Reservas/token/${encodeURIComponent(token)}/cancelar`, {
      motivo: motivo?.trim() || undefined,
    })
    return res.data?.data ?? res.data
  },

  reprogramarPorToken: async (
    token: string,
    payload: { idTrabajador: number; fechaReserva: string; horaInicio: string },
  ) => {
    const res = await apiClient.put(`/api/Reservas/token/${encodeURIComponent(token)}/reprogramar`, payload)
    return res.data?.data ?? res.data
  },

  resenaPorToken: async (token: string, calificacion: number, resena?: string) => {
    const res = await apiClient.post(`/api/Reservas/token/${encodeURIComponent(token)}/resena`, {
      puntuacion: calificacion,
      comentario: resena?.trim() || undefined,
    })
    return res.data?.data ?? res.data
  },
}