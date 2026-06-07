import { useState, useEffect } from 'react'
import { getActiveTenant, setTenant } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'
import styles from '@/styles/TenantGate.module.css'

/**
 * Envuelve las páginas del Admin. Garantiza que el tenant activo
 * (X-Tenant-Subdomain) corresponda a una sede de SU empresa antes de renderizar.
 * El selector visual de sede ahora vive en el header (SedeSwitcher / AdminHeader).
 */

// ← NUEVO: caché de sesión. Las sedes del admin no cambian mientras navega, así
// que las pedimos UNA sola vez y reutilizamos el resultado. Esto evita el spinner
// que aparecía en CADA cambio de página del panel. Se limpia solo al recargar /
// cerrar sesión (clearSedesCache), porque el módulo se reinicia.
let sedesCache: Awaited<ReturnType<typeof sedeTenantService.getMisSedes>> | null = null

/** Limpia la caché de sedes (llámalo en el logout si no haces full reload). */
export const clearSedesCache = (): void => {
  sedesCache = null
}

export function TenantGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        // ← Usa la caché si ya la tenemos; si no, pide una vez y la guarda.
        const lista = sedesCache ?? (sedesCache = await sedeTenantService.getMisSedes())
        if (cancelado) return

        const subs = lista.map((s) => s.subdominio)
        const current = getActiveTenant()

        // Si el tenant activo no es una de MIS sedes (obsoleto/heredado),
        // lo corrijo a mi primera sede y recargo una sola vez.
        if (lista.length > 0 && !subs.includes(current)) {
          setTenant(lista[0].subdominio)
          window.location.reload()
          return
        }

        setReady(true)
      } catch {
        setReady(true)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [])

  if (!ready) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return <>{children}</>
}
