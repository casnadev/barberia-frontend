import { apiClient } from './apiClient'

export interface PlanAdmin {
  idPlan: number
  nombre: string
  descripcion?: string | null
  codigoPlan?: string | null
  activo: boolean
  esPopular: boolean
  orden: number
  trialDuracionDias: number
  precioMensual: number
  moneda: string
  stripePriceId?: string | null
  stripeProductId?: string | null
  precioAnual: number
  stripePriceIdAnual?: string | null
  maxWhatsAppMes: number
  maxTrabajadores: number
  maxSedes: number
  maxEmailMes: number
  suscripcionesActivas: number
}

export type PlanAdminUpsert = Omit<PlanAdmin, 'idPlan' | 'suscripcionesActivas'>

const data = (r: any) => r?.data?.data ?? r?.data

export const superAdminPlanesService = {
  listar: async (): Promise<PlanAdmin[]> => {
    const r = await apiClient.get('/api/superadmin/catalogo-planes')
    return (data(r) ?? []) as PlanAdmin[]
  },
  crear: async (dto: PlanAdminUpsert): Promise<PlanAdmin> => {
    const r = await apiClient.post('/api/superadmin/catalogo-planes', dto)
    return data(r) as PlanAdmin
  },
  actualizar: async (id: number, dto: PlanAdminUpsert): Promise<PlanAdmin> => {
    const r = await apiClient.put(`/api/superadmin/catalogo-planes/${id}`, dto)
    return data(r) as PlanAdmin
  },
  cambiarEstado: async (id: number, activo: boolean): Promise<void> => {
    await apiClient.put(`/api/superadmin/catalogo-planes/${id}/estado`, { activo })
  },
}
