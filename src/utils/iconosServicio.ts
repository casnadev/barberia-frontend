import { Scissors, ArrowsMerge as Combine, Stack as Layers, Baby, SprayBottle as SprayCan, PenNib as PenTool, Knife as Slice, Drop as Droplets, Eye, Palette, Sparkle as Sparkles, type Icon as LucideIcon } from '@phosphor-icons/react'

/**
 * Íconos por tipo de servicio (Bloque 3). NO usamos fotos para los servicios
 * predeterminados: evita imágenes duplicadas y peso. El backend entrega una
 * "clave" de ícono en el catálogo; para servicios creados a mano, caemos a un
 * resolver por nombre. Si nada calza, usamos tijeras como genérico.
 */
const MAPA_CLAVE: Record<string, LucideIcon> = {
  scissors: Scissors,
  combine: Combine,
  layers: Layers,
  baby: Baby,
  'spray-can': SprayCan,
  'pen-tool': PenTool,
  slice: Slice,
  droplets: Droplets,
  eye: Eye,
  palette: Palette,
  sparkles: Sparkles,
}

/** Fallback por nombre para servicios que el dueño creó sin usar el catálogo. */
function porNombre(nombre: string): LucideIcon {
  const n = (nombre || '').toLowerCase()
  if (n.includes('barba') && n.includes('corte')) return Combine
  if (n.includes('full') || n.includes('combo')) return Sparkles
  if (n.includes('niñ') || n.includes('nin')) return Baby
  if (n.includes('fade') || n.includes('degrad')) return Layers
  if (n.includes('ceja')) return Eye
  if (n.includes('color') || n.includes('tinte')) return Palette
  if (n.includes('mascarilla') || n.includes('tratamiento')) return Droplets
  if (n.includes('afeit') || n.includes('navaja')) return Slice
  if (
    n.includes('perfil') ||
    n.includes('línea') ||
    n.includes('linea') ||
    n.includes('diseñ') ||
    n.includes('disen')
  )
    return PenTool
  if (n.includes('barba')) return SprayCan
  return Scissors
}

/**
 * Devuelve el componente de ícono para un servicio.
 * @param nombre nombre del servicio (para el fallback)
 * @param clave clave de ícono del catálogo predeterminado (si viene del picker)
 */
export function resolverIconoServicio(nombre?: string, clave?: string): LucideIcon {
  if (clave && MAPA_CLAVE[clave]) return MAPA_CLAVE[clave]
  return porNombre(nombre || '')
}
