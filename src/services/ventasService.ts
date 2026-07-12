/** Lo que la CAJA muestra cuando una venta acredita puntos. Solo informativo:
 *  el saldo real vive en el ledger de Barber.pe (y Wallet será su espejo). */
export interface ResultadoFidelizacion {
  idCliente: number
  nombreCliente?: string | null
  puntosGanados: number
  saldoPuntos: number
  multiplicador: number
  promocionAplicada?: string | null
  nivelNombre?: string | null
  nivelColor?: string | null
  subioDeNivel: boolean
  nivelAnterior?: string | null
  siguienteNivelNombre?: string | null
  puntosParaSiguienteNivel?: number | null
}

import { apiClient } from './apiClient'

export interface Venta {
  idVenta?: number
  id?: number
  fecha?: string
  cantidad?: number
  precio?: number
  total?: number
  montoTotal?: number
  trabajador?: string
  trabajadorId?: number
}

export const ventasService = {
  // Obtener ventas
  getVentas: async (): Promise<Venta[]> => {
    try {
      console.log('📥 Obteniendo ventas...')
      const res = await apiClient.get('/api/Ventas')
      
      console.log('📊 Respuesta completa:', res.data)
      
      // Parsear respuesta - puede venir de diferentes formas
      let data = res.data.data || res.data
      
      // Si es objeto con items
      if (data && typeof data === 'object' && data.items && Array.isArray(data.items)) {
        data = data.items
      }
      
      // Asegurar que es array
      const ventas = Array.isArray(data) ? data : []
      
      console.log('✅ Ventas obtenidas:', ventas)
      return ventas
    } catch (error) {
      console.error('❌ Error getting ventas:', error)
      return []
    }
  },

  // Resumen financiero del rango (ventas - pagos - gastos = utilidad)
  getResumenFinanciero: async (desde?: string, hasta?: string): Promise<ResumenFinanciero | null> => {
    try {
      const params = new URLSearchParams()
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      const qs = params.toString()
      const res = await apiClient.get(`/api/Ventas/resumen-financiero${qs ? `?${qs}` : ''}`)
      return res.data.data || res.data
    } catch (error) {
      console.error('❌ Error getting resumen:', error)
      return null
    }
  },

  /** Registra una venta walk-in (cliente sin reserva). Trabajador → queda pendiente de aprobación. */
  registrarWalkIn: async (payload: WalkInPayload): Promise<VentaResumen> => {
    const res = await apiClient.post('/api/Ventas/walk-in', payload)
    return res.data?.data ?? res.data
  },

  /** Listado de ventas con filtros (estado, rango de fechas, trabajador). Paginado. */
  listarVentas: async (filtros: { estado?: string; desde?: string; hasta?: string; idTrabajador?: number | null; pagina?: number; tamanoPagina?: number } = {}): Promise<VentaResumen[]> => {
    const params = new URLSearchParams()
    if (filtros.estado) params.set('estado', filtros.estado)
    if (filtros.desde) params.set('desde', filtros.desde)
    if (filtros.hasta) params.set('hasta', filtros.hasta)
    if (filtros.idTrabajador) params.set('idTrabajador', String(filtros.idTrabajador))
    params.set('pagina', String(filtros.pagina ?? 1))
    params.set('tamanoPagina', String(filtros.tamanoPagina ?? 100))
    const res = await apiClient.get(`/api/Ventas?${params.toString()}`)
    const data = res.data?.data ?? res.data
    return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
  },

  /** Cuenta rápida de ventas pendientes de aprobación (para el badge del menú). */
  contarPendientes: async (): Promise<number> => {
    try {
      const res = await apiClient.get('/api/Ventas', {
        params: { estado: 'PendienteAprobacion', pagina: 1, tamanoPagina: 1 },
      })
      const data = res.data?.data ?? res.data
      const total = data?.total ?? (Array.isArray(data?.items) ? data.items.length : Array.isArray(data) ? data.length : 0)
      return Number(total) || 0
    } catch {
      return 0
    }
  },

  /** Detalle completo de una venta (incluye servicios y motivo de rechazo). */
  obtenerVenta: async (idVenta: number): Promise<VentaResumen | null> => {
    try { const res = await apiClient.get(`/api/Ventas/${idVenta}`); return res.data?.data ?? res.data } catch { return null }
  },

  /** Admin: acepta una venta pendiente (verificó la evidencia). */
  aceptar: async (idVenta: number, motivo?: string): Promise<VentaResumen> => {
    const res = await apiClient.post(`/api/Ventas/${idVenta}/aceptar`, { motivo })
    return res.data?.data ?? res.data
  },

  /** Admin: rechaza una venta pendiente (motivo obligatorio). */
  rechazar: async (idVenta: number, motivo: string): Promise<VentaResumen> => {
    const res = await apiClient.post(`/api/Ventas/${idVenta}/rechazar`, { motivo })
    return res.data?.data ?? res.data
  },

  /** Trabajador: reenvía evidencia tras un rechazo → vuelve a pendiente. */
  reenviarEvidencia: async (idVenta: number, rutaImagenEvidencia: string, numeroOperacion?: string): Promise<VentaResumen> => {
    const res = await apiClient.post(`/api/Ventas/${idVenta}/reenviar-evidencia`, { rutaImagenEvidencia, numeroOperacion })
    return res.data?.data ?? res.data
  },
}

export interface DetalleWalkIn {
  idServicio: number
  idTrabajador: number
  cantidad: number
  precioUnitarioOverride?: number
}

export interface WalkInPayload {
  idCliente?: number
  telefonoCliente?: string
  nombreCliente?: string
  detalles: DetalleWalkIn[]
  metodoPago: string
  numeroOperacion?: string
  rutaImagenEvidencia?: string
  observacion?: string
  /** Trabajador/Admin: crea la venta "pendiente de evidencia" (la sube después). */
  permitirSinEvidencia?: boolean
  /**
   * Tarea 4 — Atribución cuando la registra un Admin:
   *   true  = "Venta mía" (Admin): se acepta al instante.
   *   false = "Venta de un profesional": queda pendiente de aprobación del Admin.
   * El backend la ignora cuando la crea un Trabajador (siempre pendiente).
   */
  atribuidaAlAdmin?: boolean
}

export interface VentaResumen {
  idVenta: number
  fechaVenta?: string
  total: number
  metodoPago: string
  numeroOperacion?: string
  rutaImagenEvidencia?: string
  estado: string
  motivoRechazo?: string
  idReserva?: number
  idCliente?: number
  nombreCliente?: string
  telefonoCliente?: string
  /** Quién CREÓ la venta (Admin o Trabajador). Card: "Creado por X". */
  nombreUsuarioRegistra?: string
  /** Profesional que ATENDIÓ (a quien se le genera la comisión). Card: "Atendido por X". */
  idTrabajador?: number
  nombreProfesional?: string
  /** Resultado de fidelización de ESTA venta (solo si acreditó puntos) → notificación en caja. */
  fidelizacion?: ResultadoFidelizacion | null
  detalles?: Array<{ idServicio: number; nombreServicio: string; idTrabajador: number; nombreTrabajador: string; cantidad: number; precioUnitario: number; subtotal: number }>
}

export interface ResumenFinanciero {
  desde?: string
  hasta?: string
  totalVentas: number
  totalPagosTrabajadores: number
  totalGastos: number
  utilidad: number
  cantidadVentas: number
}