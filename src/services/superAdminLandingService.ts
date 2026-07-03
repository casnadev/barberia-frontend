import { apiClient } from './apiClient'

// CMS de la landing principal (solo SuperAdmin). Cada llamada degrada con
// mensaje claro para que el panel no se rompa.

export interface LandingSede {
  idSede: number
  nombre: string
  nombreComercial?: string | null
  subdominio: string
  direccion?: string | null
  activa: boolean
  mostrarEnLanding: boolean
}

export interface LandingResena {
  idCalificacion: number
  puntuacion: number
  comentario?: string | null
  fecha: string
  nombreCliente?: string | null
  nombreSede: string
  mostrarEnLanding: boolean
}

export interface PlanEdit {
  idPlan: number
  nombre: string
  descripcion?: string | null
  precioMensualPEN: number
  limiteSedes: number
  limiteTrabajadores: number
  permiteWhatsApp: boolean
  permiteReportes: boolean
  esPopular: boolean
  activo: boolean
}

const data = (r: any) => r?.data?.data ?? r?.data ?? []

export const superAdminLandingService = {
  // ── Sedes ───────────────────────────────────────────────────────────────
  getSedes: async (): Promise<LandingSede[]> => {
    const r = await apiClient.get('/api/superadmin/landing/sedes')
    return data(r) as LandingSede[]
  },
  toggleSede: async (idSede: number, mostrar: boolean): Promise<void> => {
    await apiClient.put(`/api/superadmin/landing/sedes/${idSede}`, { mostrar })
  },

  // ── Reseñas ─────────────────────────────────────────────────────────────
  getResenas: async (): Promise<LandingResena[]> => {
    const r = await apiClient.get('/api/superadmin/landing/resenas')
    return data(r) as LandingResena[]
  },
  toggleResena: async (idCalificacion: number, mostrar: boolean): Promise<void> => {
    await apiClient.put(`/api/superadmin/landing/resenas/${idCalificacion}`, { mostrar })
  },

  // ── Planes ──────────────────────────────────────────────────────────────
  getPlanes: async (): Promise<PlanEdit[]> => {
    const r = await apiClient.get('/api/superadmin/landing/planes')
    return data(r) as PlanEdit[]
  },
  editarPlan: async (plan: PlanEdit): Promise<void> => {
    await apiClient.put(`/api/superadmin/landing/planes/${plan.idPlan}`, plan)
  },
}
