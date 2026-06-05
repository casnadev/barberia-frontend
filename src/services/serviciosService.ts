import { apiClient } from './apiClient'

export const serviciosService = {
  getServicios: async (idSede?: number) => {
    const res = await apiClient.get('/api/Servicios', { params: { idSede } })
    return res.data.data || []
  }
}
