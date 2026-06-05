import { useState, useEffect } from 'react'
import { getActiveTenant, setTenant } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'
import styles from '@/styles/TenantGate.module.css'

/**
 * Envuelve las páginas del Admin. Garantiza que el tenant activo
 * (X-Tenant-Subdomain) corresponda a una sede de SU empresa antes de renderizar.
 * El selector visual de sede ahora vive en el header (SedeSwitcher / AdminHeader).
 */
export function TenantGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const lista = await sedeTenantService.getMisSedes()
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
