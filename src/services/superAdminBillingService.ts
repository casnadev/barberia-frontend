import { apiClient } from './apiClient'

export interface EmpresaBilling {
  idEmpresa: number
  nombre: string
  plan?: string | null
  estado: string
  esTrial: boolean
  trialEnd?: string | null
  proximoCobro?: string | null
  tieneStripeCustomer: boolean
  tieneStripeSubscription: boolean
  proveedorPago?: string | null
  saldoReferidoPEN: number
  referidosConfirmados: number
  whatsAppUsadoMes: number
  ultimoPagoFecha?: string | null
  ultimoPagoEstado?: string | null
  ultimoPagoMonto?: number | null
}

export interface ResumenBilling {
  totalEmpresas: number
  activas: number
  enTrial: number
  suspendidas: number
  ingresosMesPEN: number
  webhooksTotal: number
  webhooksConError: number
}

export interface SuperAdminBilling {
  resumen: ResumenBilling
  empresas: EmpresaBilling[]
}

const data = (r: any) => r?.data?.data ?? r?.data

export const superAdminBillingService = {
  listar: async (): Promise<SuperAdminBilling> => {
    const r = await apiClient.get('/api/superadmin/billing/empresas')
    return data(r) as SuperAdminBilling
  },
}
