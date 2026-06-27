import { lazy } from 'react'

/**
 * Fuente ÚNICA de verdad para los chunks de las páginas del panel admin.
 *
 * Cada entrada de `importers` es la MISMA función `import()` que usa `lazy()`.
 * Como Vite/Rollup deduplican los módulos por su especificador, llamar a
 * `importers.Dashboard()` desde el prefetch calienta EXACTAMENTE el mismo chunk
 * que luego resolverá `<DashboardPage/>`. Así el prefetch no duplica descargas.
 */
const importers = {
  Dashboard: () => import('@/pages/admin/DashboardPage'),
  Servicios: () => import('@/pages/admin/ServiciosPage'),
  Trabajadores: () => import('@/pages/admin/TrabajadoresPage'),
  Agenda: () => import('@/pages/admin/AgendaPage'),
  Clientes: () => import('@/pages/admin/ClientesPage'),
  Reservas: () => import('@/pages/admin/ReservasPage'),
  Ventas: () => import('@/pages/admin/VentasPage'),
  Pagos: () => import('@/pages/admin/PagosPage'),
  Caja: () => import('@/pages/admin/CierreCaja'),
  Configuracion: () => import('@/pages/admin/ConfiguracionPage'),
  MiPlan: () => import('@/pages/admin/MiPlanPage'),
} as const

// --- Componentes lazy (se consumen en App.tsx) ---
export const DashboardPage = lazy(() => importers.Dashboard().then((m) => ({ default: m.DashboardPage })))
export const ServiciosPage = lazy(() => importers.Servicios().then((m) => ({ default: m.ServiciosPage })))
export const TrabajadoresPage = lazy(() => importers.Trabajadores().then((m) => ({ default: m.TrabajadoresPage })))
export const AgendaPage = lazy(() => importers.Agenda().then((m) => ({ default: m.AgendaPage })))
export const ClientesPage = lazy(() => importers.Clientes().then((m) => ({ default: m.ClientesPage })))
export const ReservasPage = lazy(() => importers.Reservas().then((m) => ({ default: m.ReservasPage })))
export const VentasPage = lazy(() => importers.Ventas().then((m) => ({ default: m.VentasPage })))
export const PagosPage = lazy(() => importers.Pagos().then((m) => ({ default: m.PagosPage })))
export const CierreCajaPage = lazy(() => importers.Caja().then((m) => ({ default: m.CierreCajaPage })))
export const ConfiguracionPage = lazy(() => importers.Configuracion().then((m) => ({ default: m.ConfiguracionPage })))
export const MiPlanPage = lazy(() => importers.MiPlan().then((m) => ({ default: m.MiPlanPage })))

/**
 * Pre-descarga TODOS los chunks del panel admin cuando el navegador está ocioso.
 * Se llama una vez desde <AdminShell/> al montar. Tras esto, navegar entre
 * Dashboard ⇄ Clientes ⇄ Agenda ⇄ … es SÍNCRONO (el chunk ya está en caché),
 * por lo que React no muestra ningún fallback de Suspense: navegación instantánea
 * estilo Linear/Vercel. Es idempotente: solo corre la primera vez.
 */
let prefetched = false
export function prefetchAdminPages(): void {
  if (prefetched) return
  prefetched = true

  const run = () => {
    for (const load of Object.values(importers)) {
      // Silenciamos errores: si un chunk falla, se reintentará al navegar.
      Promise.resolve(load()).catch(() => {})
    }
  }

  if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
    ;(window as any).requestIdleCallback(run, { timeout: 2000 })
  } else {
    setTimeout(run, 300)
  }
}
