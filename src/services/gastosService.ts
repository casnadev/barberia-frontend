import { apiClient } from './apiClient'

export interface Gasto {
  id?: number
  idGasto?: number
  descripcion: string
  monto: number
  fecha?: string
}

export const gastosService = {
  getGastos: async (): Promise<Gasto[]> => {
    try {
      const res = await apiClient.get('/api/Gastos')
      const data = res.data.data || res.data
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error getting gastos:', error)
      return []
    }
  },

  createGasto: async (gasto: Partial<Gasto>) => {
    const res = await apiClient.post('/api/Gastos', gasto)
    return res.data.data || res.data
  },

  updateGasto: async (id: number, gasto: Partial<Gasto>) => {
    const res = await apiClient.put(`/api/Gastos/${id}`, gasto)
    return res.data.data || res.data
  },

  deleteGasto: async (id: number) => {
    const res = await apiClient.delete(`/api/Gastos/${id}`)
    return res.data.data || res.data
  }
}