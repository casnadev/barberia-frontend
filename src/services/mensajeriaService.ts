import { apiClient } from './apiClient'

// Detalle de mensajes (cola/outbox) para "Mi Plan". Reutiliza GET /api/mensajeria/cola,
// que ya aísla por sede del usuario autenticado.

export interface MensajeFila {
  idMensaje: number
  codigoPlantilla: string
  canal: string
  destinatarioTelefono: string
  destinatarioNombre?: string | null
  estado: string
  fechaCreacion: string
  fechaEnviado?: string | null
  ultimoError?: string | null
}

export interface MensajesPagina {
  items: MensajeFila[]
  total: number
}

const data = (r: any) => r?.data?.data ?? r?.data

export const mensajeriaService = {
  listarMes: async (desdeUtcISO: string, tamano = 50): Promise<MensajesPagina> => {
    const r = await apiClient.get('/api/mensajeria/cola', {
      params: { desdeUtc: desdeUtcISO, tamanoPagina: tamano, pagina: 1 },
    })
    const d = data(r)
    return { items: (d?.items ?? d ?? []) as MensajeFila[], total: d?.total ?? (d?.items?.length ?? 0) }
  },
}
