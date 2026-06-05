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