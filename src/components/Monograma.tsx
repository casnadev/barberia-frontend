import type { CSSProperties } from 'react'

/** Iniciales de un nombre: "Barbería Nader" -> "BN". Máximo 2 letras. */
export const iniciales = (nombre?: string | null): string =>
  (nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'

/** Color determinístico a partir de un texto (mismo nombre -> mismo color). */
export const colorDesdeTexto = (texto?: string | null): string => {
  const s = (texto || '').trim()
  if (!s) return '#64748b'
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return `hsl(${h} 58% 48%)`
}

type MonogramaProps = {
  /** Nombre del que se sacan las iniciales. */
  texto?: string | null
  /** Tamaño en px (modo avatar/logo). Se ignora si `fill`. */
  size?: number
  /** Ocupa todo el contenedor (para hero/portada). */
  fill?: boolean
  /** Color de fondo. Si no se pasa, se deriva del texto (color de marca recomendado). */
  color?: string
  /** border-radius. Default: círculo si `size`, 0 si `fill`. */
  radio?: number | string
  className?: string
  style?: CSSProperties
}

/**
 * Bloque con iniciales sobre color sólido. Sirve como avatar, logo o portada
 * por defecto: único por negocio (usa su color de marca), nunca se ve roto y
 * no necesita ningún archivo. Es puramente decorativo (aria-hidden).
 */
export default function Monograma({
  texto,
  size = 40,
  fill = false,
  color,
  radio,
  className,
  style,
}: MonogramaProps) {
  const ini = iniciales(texto)
  const bg = color || colorDesdeTexto(texto)
  const dim = fill ? '100%' : `${size}px`
  const fontSize = fill ? 'clamp(28px, 12vw, 72px)' : Math.round(size * 0.42)
  const br = radio != null ? radio : fill ? 0 : '50%'

  return (
    <div
      aria-hidden
      className={className}
      style={{
        width: dim,
        height: dim,
        borderRadius: br,
        background: bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        letterSpacing: '0.02em',
        fontSize,
        lineHeight: 1,
        userSelect: 'none',
        overflow: 'hidden',
        ...style,
      }}
    >
      {ini}
    </div>
  )
}
