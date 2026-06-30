/**
 * Skeleton — primitivos de carga reutilizables (placeholder con shimmer).
 *
 * Reemplazan al clásico "círculo + Cargando…" que blanquea la pantalla. En vez
 * de un vacío con spinner, mostramos la SILUETA del contenido (filas, tarjetas,
 * texto) para que la espera se perciba mucho más corta — patrón Linear/Vercel.
 *
 * Usa la utilidad global `.sk` (definida en styles/globals.css), así que el
 * shimmer es coherente en toda la app y respeta `prefers-reduced-motion`.
 */
import type { CSSProperties } from 'react'

type SkProps = {
  /** Ancho (px o cualquier unidad CSS). Por defecto 100%. */
  w?: number | string
  /** Alto (px o unidad CSS). Por defecto 1em. */
  h?: number | string
  /** Radio del borde. Por defecto 8px. */
  r?: number | string
  /** Círculo (avatares). Ignora `r`. */
  circle?: boolean
  className?: string
  style?: CSSProperties
}

const dim = (v?: number | string, fallback?: string) =>
  v === undefined ? fallback : typeof v === 'number' ? `${v}px` : v

/** Bloque skeleton base. */
export function Skeleton({ w, h, r = 8, circle, className = '', style }: SkProps) {
  return (
    <span
      aria-hidden="true"
      className={`sk ${className}`}
      style={{
        width: dim(w, '100%'),
        height: dim(h, '1em'),
        borderRadius: circle ? '9999px' : dim(r),
        display: 'block',
        ...style,
      }}
    />
  )
}

/** Varias líneas de texto con la última más corta (look natural de párrafo). */
export function SkeletonText({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} h={12} w={i === lines - 1 ? '60%' : '100%'} r={6} />
      ))}
    </span>
  )
}

/** Tarjeta genérica (avatar + dos líneas). Ideal para listas de clientes/equipo. */
export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        padding: 16,
        border: '1px solid var(--color-border, #e5e7eb)',
        borderRadius: 'var(--radius, 12px)',
        background: '#fff',
      }}
    >
      <Skeleton circle w={44} h={44} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton h={13} w="55%" />
        <Skeleton h={11} w="35%" />
      </div>
    </div>
  )
}

/** Bloque de N tarjetas skeleton (para grids/listas). */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ display: 'grid', gap: 12 }}
    >
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/** Filas para tablas (cada fila = varias celdas). */
export function SkeletonRows({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              h={14}
              w={c === 0 ? '28%' : c === cols - 1 ? '12%' : '20%'}
              r={6}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
