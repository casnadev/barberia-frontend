/**
 * prefetch.ts — Prefetch de DATOS por intención (hover / touch / focus).
 *
 * El panel ya pre-descarga los CHUNKS de cada sección en idle (router/adminPages
 * → prefetchAdminPages). Esto va un paso más allá: cuando el cursor o el dedo
 * tocan un enlace del menú, calentamos también los DATOS de esa sección en la
 * caché de React Query. Resultado: al soltar el clic, la página abre con datos
 * ya listos → navegación sin "Cargando…".
 *
 * Reglas:
 *  • Usamos EXACTAMENTE las mismas queryKey/queryFn que cada página, para que el
 *    prefetch caliente la MISMA entrada de caché que luego consume el componente
 *    (cero descargas duplicadas).
 *  • prefetchQuery respeta el `staleTime` global (5 min): si el dato ya está
 *    fresco, no vuelve a pedir. Pasar el cursor mil veces es gratis.
 *  • Las secciones que dependen de la sede activa resuelta de forma asíncrona
 *    (p. ej. Clientes) NO se prefetchean aquí para no adivinar la sede; abren
 *    igual de rápido gracias al chunk ya cargado + skeleton.
 */
import type { QueryClient } from '@tanstack/react-query'
import { reservasService } from '@/services/reservasService'
import { ventasService } from '@/services/ventasService'
import { clientesService } from '@/services/clientesService'
import { apiClient, getActiveTenant } from '@/services/apiClient'

/** Fecha local YYYY-MM-DD (sin corrimiento UTC). */
export const isoLocal = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ─────────────────────────────────────────────────────────────────────────────
// QUERY KEYS — fuente única de verdad. Las páginas migradas importan de aquí
// para que prefetch y consumo coincidan SIEMPRE.
// ─────────────────────────────────────────────────────────────────────────────
export const qk = {
  reservasAdmin: ['reservas', 'admin'] as const,
  trabajadores: ['trabajadores', 'admin-todos'] as const,
  servicios: ['servicios', 'admin-todos'] as const,
  ventas: (d: string, h: string) => ['ventas', d, h] as const,
  dashboardResumen: (tenant: string, d: string, h: string) =>
    ['dashboard', 'resumen', tenant, d, h] as const,
  dashboardHoy: (tenant: string) => ['dashboard', 'hoy', tenant] as const,
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCHERS DEL DASHBOARD — compartidos entre el prefetch y la propia página
// (DashboardPage los importa) para no duplicar lógica.
// ─────────────────────────────────────────────────────────────────────────────

/** Agrupa las ventas por día del rango [d, h] → serie para la gráfica. */
export function construirSerieVentas(
  ventas: any[],
  d: string,
  h: string,
): { label: string; valor: number }[] {
  const dias: string[] = []
  const di = new Date(`${d}T00:00:00`)
  const hi = new Date(`${h}T00:00:00`)
  for (let cur = new Date(di); cur <= hi; cur.setDate(cur.getDate() + 1)) {
    dias.push(isoLocal(new Date(cur)))
  }
  const porDia: Record<string, number> = {}
  dias.forEach((x) => { porDia[x] = 0 })
  ;(ventas || []).forEach((v: any) => {
    const f = v.fechaVenta ? isoLocal(new Date(v.fechaVenta)) : null
    if (f && f in porDia) porDia[f] += Number(v.total || 0)
  })
  const fmtDia = (iso: string) => {
    try { return String(new Date(`${iso}T00:00:00`).getDate()) } catch { return iso }
  }
  return dias.map((x) => ({ label: fmtDia(x), valor: porDia[x] }))
}

/** Resumen financiero + serie de la gráfica para el rango [d, h]. */
export async function fetchDashboardResumen(d: string, h: string) {
  const [resumen, ventas] = await Promise.all([
    ventasService.getResumenFinanciero(d, h),
    ventasService.listarVentas({ desde: d, hasta: h, tamanoPagina: 1000 }),
  ])
  return { resumen, serie: construirSerieVentas(ventas, d, h) }
}

/** Métricas de "hoy": nº de clientes y reservas de hoy. */
export async function fetchDashboardHoy() {
  const hoy = isoLocal()
  const [clientesRes, reservas] = await Promise.all([
    clientesService.getClientes(),
    reservasService.getReservas(),
  ])
  const rHoy = Array.isArray(reservas)
    ? reservas.filter((r: any) => r.fechaReserva === hoy)
    : []
  return {
    clientes: Array.isArray(clientesRes) ? clientesRes.length : 0,
    reservasHoy: rHoy.length,
    reservasConfirmadas: rHoy.filter((r: any) => r.estado === 'Confirmada').length,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO DE PREFETCH POR RUTA
// ─────────────────────────────────────────────────────────────────────────────
type Prefetcher = (qc: QueryClient) => void

const PREFETCH: Record<string, Prefetcher> = {
  '/dashboard': (qc) => {
    const t = getActiveTenant()
    const hoy = isoLocal()
    qc.prefetchQuery({ queryKey: qk.dashboardResumen(t, hoy, hoy), queryFn: () => fetchDashboardResumen(hoy, hoy) })
    qc.prefetchQuery({ queryKey: qk.dashboardHoy(t), queryFn: fetchDashboardHoy })
  },
  '/admin/reservas': (qc) => {
    qc.prefetchQuery({
      queryKey: qk.reservasAdmin,
      queryFn: async () => {
        const d = await reservasService.getReservas()
        return Array.isArray(d) ? d : []
      },
    })
  },
  '/admin/trabajadores': (qc) => {
    qc.prefetchQuery({
      queryKey: qk.trabajadores,
      queryFn: async () => {
        const res = await apiClient.get('/api/Trabajadores/admin/todos')
        const d = res.data.data ?? res.data
        return Array.isArray(d) ? d : []
      },
    })
  },
  '/admin/servicios': (qc) => {
    qc.prefetchQuery({
      queryKey: qk.servicios,
      queryFn: async () => {
        const res = await apiClient.get('/api/Servicios/admin/todos')
        const d = res.data.data || res.data
        return Array.isArray(d) ? d : []
      },
    })
  },
  '/admin/ventas': (qc) => {
    const hoy = isoLocal()
    qc.prefetchQuery({
      queryKey: qk.ventas(hoy, hoy),
      queryFn: async () => {
        const d = await ventasService.listarVentas({ desde: hoy, hasta: hoy, tamanoPagina: 200 })
        return Array.isArray(d) ? d : []
      },
    })
  },
}

/** Dispara el prefetch de datos de una ruta (si está registrada). Idempotente y barato. */
export function prefetchRouteData(qc: QueryClient, path: string): void {
  try {
    PREFETCH[path]?.(qc)
  } catch {
    /* el prefetch nunca debe romper la navegación */
  }
}
