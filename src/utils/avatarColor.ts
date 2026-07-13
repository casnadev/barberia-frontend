/**
 * avatarColor — color de avatar DETERMINÍSTICO a partir de un nombre.
 *
 * En las reseñas los avatares eran círculos grises idénticos, y la sección
 * parecía un placeholder en vez de gente real. La tentación es usar un color
 * aleatorio, pero eso PARPADEA: cada render devuelve otro color y el mismo
 * cliente cambia de identidad al hacer scroll.
 *
 * Aquí el color sale de un hash del nombre, así que "Nader" es SIEMPRE el mismo
 * violeta, en la landing, en el micrositio y en el panel maestro.
 *
 * La paleta está pensada para el fondo oscuro de la landing (contraste AA con
 * texto blanco) y se reutiliza tal cual sobre fondo claro porque todos los tonos
 * son medios-saturados.
 */

/** Paleta base. Tonos distinguibles entre sí incluso en avatares de 44px. */
const PALETA: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: '#6366f1', fg: '#ffffff' }, // indigo
  { bg: '#0ea5e9', fg: '#ffffff' }, // sky
  { bg: '#10b981', fg: '#04291f' }, // emerald
  { bg: '#f59e0b', fg: '#3d2600' }, // amber
  { bg: '#ef4444', fg: '#ffffff' }, // red
  { bg: '#ec4899', fg: '#ffffff' }, // pink
  { bg: '#8b5cf6', fg: '#ffffff' }, // violet
  { bg: '#14b8a6', fg: '#052e2b' }, // teal
]

/**
 * Hash estable (djb2). No es criptográfico: solo necesita repartir bien y
 * devolver SIEMPRE lo mismo para la misma entrada.
 */
const hash = (texto: string): number => {
  let h = 5381
  for (let i = 0; i < texto.length; i++) {
    h = ((h << 5) + h + texto.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export interface AvatarColor {
  /** Color de fondo del círculo. */
  bg: string
  /** Color del texto (iniciales) con contraste suficiente sobre `bg`. */
  fg: string
}

/** Color de avatar para un nombre. Vacío/nulo → un gris neutro estable. */
export function avatarColor(nombre?: string | null): AvatarColor {
  const clave = (nombre ?? '').trim().toLowerCase()
  if (!clave) return { bg: '#3f3f46', fg: '#e4e4e7' }
  return PALETA[hash(clave) % PALETA.length]
}

/**
 * Iniciales de un nombre: máximo 2 letras.
 *   "nader leo"  → "NL"
 *   "NuevoYO"    → "N"
 */
export function iniciales(nombre?: string | null): string {
  const partes = (nombre ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase()
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase()
}
