import { useState, useEffect } from 'react'
import { getActiveTenant, setTenant } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'
import { useAuthStore } from '@/store/authStore'
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

        const current = getActiveTenant()

        // Sedes ACTIVAS de mi empresa (estado !== false; undefined = activa).
        const activas = lista.filter((s) => s.estado !== false)
        const sedeActual = lista.find((s) => s.subdominio === current)
        const actualEsValida = !!sedeActual && sedeActual.estado !== false

        // Si la sede activa NO sirve (desactivada, eliminada u obsoleta):
        if (!actualEsValida) {
          if (activas.length > 0) {
            // Tengo otras sedes activas → cambio a la primera y recargo una vez.
            setTenant(activas[0].subdominio)
            window.location.reload()
            return
          }
          // No me queda NINGUNA sede activa. Solo deslogueo si REALMENTE estaba
          // dentro de una sede (current seteado) que ahora está caída; así evito
          // deslogueos en estados ambiguos (sin tenant aún). Voy a la página
          // pública, que mostrará "establecimiento no disponible".
          if (current) {
            clearSedesCache()
            useAuthStore.getState().logout()
            window.location.href = '/'
            return
          }
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
