import { useState, useEffect } from 'react'
import { getActiveTenant, setTenant } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'
import { useAuthStore } from '@/store/authStore'
import styles from '@/styles/TenantGate.module.css'

/**
 * Envuelve las páginas del Admin. Garantiza que el tenant activo
 * (X-Tenant-Subdomain) corresponda a una sede ACTIVA de SU empresa antes de
 * renderizar. Si el negocio está PAUSADO (sin sedes activas), el admin SÍ pudo
 * iniciar sesión, pero en vez del panel ve la pantalla "Tu negocio está pausado".
 */

// Caché de sesión: las sedes del admin no cambian mientras navega.
let sedesCache: Awaited<ReturnType<typeof sedeTenantService.getMisSedes>> | null = null

/** Limpia la caché de sedes (llámalo en el logout si no haces full reload). */
export const clearSedesCache = (): void => {
  sedesCache = null
}

type Estado = 'cargando' | 'ok' | 'pausado'

export function TenantGate({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando')

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const lista = sedesCache ?? (sedesCache = await sedeTenantService.getMisSedes())
        if (cancelado) return

        const current = getActiveTenant()

        // Sedes ACTIVAS de mi empresa (estado !== false; undefined = activa).
        const activas = lista.filter((s) => s.estado !== false)
        const sedeActual = lista.find((s) => s.subdominio === current)
        const actualEsValida = !!sedeActual && sedeActual.estado !== false

        // Caso 1: NINGUNA sede activa → negocio pausado. No deslogueo: muestro
        // la pantalla de pausa (el dueño puede contactar soporte / reactivar).
        if (activas.length === 0) {
          setEstado('pausado')
          return
        }

        // Caso 2: la sede activa no sirve (desactivada/obsoleta) pero tengo otras
        // activas → cambio a la primera activa y recargo una sola vez.
        if (!actualEsValida) {
          setTenant(activas[0].subdominio)
          window.location.reload()
          return
        }

        // Caso 3: todo en orden.
        setEstado('ok')
      } catch {
        // Ante error de red, no bloqueo el panel.
        setEstado('ok')
      }
    })()
    return () => {
      cancelado = true
    }
  }, [])

  if (estado === 'cargando') {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (estado === 'pausado') {
    return <NegocioPausado />
  }

  return <>{children}</>
}

/** Pantalla mostrada al dueño cuando su negocio está pausado (sin sedes activas). */
function NegocioPausado() {
  const logout = useAuthStore((s) => s.logout)
  const salir = () => {
    clearSedesCache()
    logout()
    window.location.href = '/'
  }
  return (
    <div style={pausaWrap}>
      <div style={pausaCard}>
        <img src="/barber-logo-black.png" alt="Barber.pe" style={pausaLogo} />
        <h1 style={pausaTitle}>Tu negocio está pausado</h1>
        <p style={pausaText}>
          Tu barbería está temporalmente desactivada, por lo que tu sitio público
          no está disponible. Tus datos están a salvo.
        </p>
        <p style={pausaTextMuted}>
          Para reactivarla, comunícate con el equipo de Barber.pe.
        </p>
        <div style={pausaBtns}>
          <a href="mailto:contacto@barber.pe" style={pausaBtnPrimary}>Contactar soporte</a>
          <button onClick={salir} style={pausaBtnGhost}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}

const pausaWrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#f3f4f6', padding: 24,
}
const pausaCard: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 440, width: '100%',
  textAlign: 'center', boxShadow: '0 10px 40px rgba(17,24,39,0.10)',
}
const pausaLogo: React.CSSProperties = { width: 88, height: 88, objectFit: 'contain', margin: '0 auto 20px', display: 'block', opacity: 0.95 }
const pausaTitle: React.CSSProperties = { fontSize: 22, fontWeight: 800, marginBottom: 10, color: '#111827' }
const pausaText: React.CSSProperties = { color: '#4b5563', marginBottom: 8, lineHeight: 1.5 }
const pausaTextMuted: React.CSSProperties = { color: '#9ca3af', fontSize: 14, marginBottom: 24 }
const pausaBtns: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 }
const pausaBtnPrimary: React.CSSProperties = {
  display: 'inline-block', textDecoration: 'none', background: '#2855F6', color: '#fff',
  fontWeight: 700, padding: '12px 18px', borderRadius: 12,
}
const pausaBtnGhost: React.CSSProperties = {
  background: 'transparent', color: '#6b7280', fontWeight: 600, padding: '10px 18px',
  borderRadius: 12, border: '1px solid #e5e7eb', cursor: 'pointer',
}
