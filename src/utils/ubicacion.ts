// Helpers de ubicación reutilizables (mismo comportamiento que ConfiguracionPage).
// Extraídos aquí para que el modal "Agregar local" y la config compartan una sola
// fuente de verdad al leer coordenadas de un enlace de Google Maps o texto pegado.

/** ¿lat/lng son numéricos y están en rango (y no 0,0)? */
export function esCoordValida(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0)
  )
}

/** Intenta extraer coordenadas de un texto/enlace SIN llamar al backend. */
export function parseCoordsLocal(texto: string): { lat: number; lng: number } | null {
  const t = (texto || '').trim()
  if (!t) return null
  const patrones = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|center|destination|daddr)=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/,
  ]
  for (const re of patrones) {
    const m = t.match(re)
    if (m) {
      const lat = parseFloat(m[1])
      const lng = parseFloat(m[2])
      if (esCoordValida(lat, lng)) return { lat, lng }
    }
  }
  return null
}

/** ¿El texto parece un enlace http(s)? (para decidir si resolvemos en el backend). */
export function pareceLink(t: string): boolean {
  return /^https?:\/\//i.test((t || '').trim())
}

/** Src del mini-mapa de confirmación con OpenStreetMap (sin API key). */
export function osmEmbedSrc(lat: number, lng: number): string {
  const dx = 0.004
  const dy = 0.003
  const bbox = `${lng - dx},${lat - dy},${lng + dx},${lat + dy}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${lat},${lng}`
}
