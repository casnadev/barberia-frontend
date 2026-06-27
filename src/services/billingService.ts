import { apiClient } from './apiClient'

// Servicio de facturación/suscripción del Admin (empresa actual). Cada llamada
// degrada con mensaje claro para que el panel no se rompa.

const data = (r: any) => r?.data?.data ?? r?.data

export interface Consumo {
  usado: number
  limite: number | null
  ilimitado: boolean
  restante: number | null
}

export interface ReferidoFila {
  idReferido: number
  empresa?: string | null
  estado: string
  fechaRegistro: string
  fechaConfirmacion?: string | null
  montoGanadoPEN: number
}

export interface PagoFila {
  fecha: string
  tipo: string
  monto: number
  moneda: string
  estado: string
  urlFactura?: string | null
}

export interface ConsumoFila {
  anio: number
  mes: number
  recurso: string
  cantidad: number
  limite: number | null
}

export interface MiPlan {
  idPlan: number
  nombrePlan: string
  codigoPlan?: string | null
  precioMensualPEN: number

  estado: string
  esTrial: boolean
  esDemo: boolean
  fechaInicio?: string | null
  fechaFin?: string | null
  trialEnd?: string | null
  proximoCobro?: string | null
  cancelAtPeriodEnd: boolean
  diasRestantes?: number | null

  proveedorPago?: string | null
  tieneMetodoPago: boolean

  whatsApp: Consumo
  trabajadores: Consumo
  sedes: Consumo

  codigoReferido?: string | null
  saldoReferidoPEN: number
  referidosTotal: number
  referidosConfirmados: number
  referidosPendientes: number
  referidos: ReferidoFila[]

  historialPagos: PagoFila[]
  historialConsumo: ConsumoFila[]
}

export const billingService = {
  getMiPlan: async (): Promise<MiPlan> => {
    const r = await apiClient.get('/api/billing/mi-plan')
    return data(r) as MiPlan
  },

  /** Inicia el checkout de un plan y devuelve la URL a la que redirigir. */
  iniciarCheckout: async (idPlan: number, intervalo = 'month'): Promise<string> => {
    const r = await apiClient.post('/api/billing/checkout', { idPlan, intervalo })
    const d = data(r)
    return (d?.url ?? '') as string
  },

  /** Abre el Customer Portal y devuelve la URL. */
  abrirPortal: async (): Promise<string> => {
    const r = await apiClient.post('/api/billing/portal', {})
    const d = data(r)
    return (d?.url ?? '') as string
  },
}
