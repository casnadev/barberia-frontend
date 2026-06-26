import type { ReactNode } from 'react'

/**
 * AdminLayout — SHIM DE COMPATIBILIDAD (passthrough).
 *
 * El layout persistente del panel (riel lateral, header con SedeSwitcher +
 * AccountMenu, footer móvil y FAB de "Venta rápida") AHORA vive en
 * <AdminShell/> y se monta UNA sola vez a nivel de ruta (ver App.tsx).
 *
 * Antes, CADA página del admin hacía:
 *
 *     return (
 *       <AdminLayout title="..." subtitle="...">
 *         ...contenido...
 *       </AdminLayout>
 *     )
 *
 * lo que reconstruía TODO el shell (sidebar/header/etc.) en cada navegación y
 * provocaba el parpadeo. Para no tener que tocar las ~10 páginas (y evitar
 * cualquier riesgo de romperlas), este componente quedó como un simple
 * passthrough: renderiza su contenido tal cual dentro del <Outlet/> del shell.
 *
 * Las props `title`/`subtitle` se conservan por compatibilidad y se ignoran:
 * el AdminHeader nunca las mostró (eran props muertas).
 *
 * NOTA: puedes, opcionalmente y sin prisa, ir limpiando cada página para que
 * devuelva su contenido directamente (sin envolverlo en <AdminLayout>). No es
 * necesario para eliminar el parpadeo; este shim ya lo resuelve.
 */
export function AdminLayout({ children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return <>{children}</>
}
