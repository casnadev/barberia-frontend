import { useState, useEffect } from 'react'
import { apiClient } from '@/services/apiClient'

/**
 * Guard para paneles de Trabajador y Cliente. Verifica que la sede actual
 * (resuelta por subdominio) esté ACTIVA. Si el negocio fue pausado, en vez del
 * panel muestra "El sitio está pausado". NO desloguea: el usuario conserva su
 * sesión y puede volver cuando se reactive.
 */

type Estado = 'cargando' | 'ok' | 'pausada'

// Caché de sesión: la sede no cambia mientras el usuario navega.
let sedePausadaCache: boolean | null = null
export const clearSedeActivaCache = (): void => { sedePausadaCache = null }

export function SedeActivaGate({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>(
    sedePausadaCache === null ? 'cargando' : (sedePausadaCache ? 'pausada' : 'ok')
  )

  useEffect(() => {
    if (sedePausadaCache !== null) return
    let cancelado = false
    ;(async () => {
      try {
        const res = await apiClient.get('/api/Sedes/actual')
        const sede = res.data?.data ?? res.data
        if (cancelado) return
        const pausada = sede?.estado === false
        sedePausadaCache = pausada
        setEstado(pausada ? 'pausada' : 'ok')
      } catch {
        // Ante error de red no bloqueo el panel.
        if (!cancelado) setEstado('ok')
      }
    })()
    return () => { cancelado = true }
  }, [])

  if (estado === 'cargando') {
    return (
      <div style={wrap}>
        <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-gray-200 border-t-blue-500" />
      </div>
    )
  }

  if (estado === 'pausada') {
    return (
      <div style={wrap}>
        <div style={card}>
          <img src="/barber-logo-black.png" alt="Barber.pe" style={logo} />
          <h1 style={title}>El sitio está pausado</h1>
          <p style={text}>
            Por el momento este establecimiento no está disponible.
          </p>
          <p style={muted}>Gracias por tu visita.</p>
          <a href="https://barber.pe" style={btn}>Ir a Barber.pe</a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#f3f4f6', padding: 24,
}
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '40px 32px', maxWidth: 440, width: '100%',
  textAlign: 'center', boxShadow: '0 10px 40px rgba(17,24,39,0.10)',
}
const logo: React.CSSProperties = { width: 88, height: 88, objectFit: 'contain', margin: '0 auto 20px', display: 'block', opacity: 0.95 }
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, marginBottom: 10, color: '#111827' }
const text: React.CSSProperties = { color: '#4b5563', marginBottom: 8, lineHeight: 1.5 }
const muted: React.CSSProperties = { color: '#9ca3af', fontSize: 14, marginBottom: 22 }
const btn: React.CSSProperties = {
  display: 'inline-block', textDecoration: 'none', background: '#2855F6', color: '#fff',
  fontWeight: 700, padding: '12px 18px', borderRadius: 12,
}
