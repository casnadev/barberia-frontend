import { apiClient } from './apiClient'

// Sandbox SuperAdmin: simular eventos de billing sin Stripe. Solo funciona si el
// backend tiene Billing:SandboxHabilitado = true (si no, responde 404).

export type AccionSandbox = 'pago-exitoso' | 'pago-fallido' | 'renovacion' | 'fin-trial'

export const superAdminSandboxService = {
  simular: async (accion: AccionSandbox, idEmpresa: number): Promise<string> => {
    const r = await apiClient.post(`/api/superadmin/sandbox/${accion}`, { idEmpresa })
    return (r?.data?.mensaje ?? r?.data?.data ?? 'Simulado.') as string
  },
}
