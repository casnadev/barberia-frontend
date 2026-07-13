/**
 * fechaResena — formato ÚNICO de la fecha de una reseña.
 *
 * Regla: nunca el día exacto. Con pocas reseñas, "3 de julio de 2026" delata el
 * volumen real del negocio y además envejece mal ("¿solo tienen reseñas de
 * marzo?"). Se muestra en relativo hasta el año, y de ahí en adelante mes+año.
 *
 *   hoy            → "hoy"
 *   1 día          → "ayer"
 *   2-6 días       → "hace 3 días"
 *   1-4 semanas    → "hace 2 semanas"
 *   1-11 meses     → "hace 5 meses"
 *   ≥ 12 meses     → "mar 2025"
 *
 * La landing y el micrositio usan ESTA función. Antes el micrositio pintaba
 * `toLocaleDateString('es-PE')` (13/7/2026) y la landing no pintaba nada.
 */

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

const MS_DIA = 86_400_000

/**
 * Devuelve el texto de la fecha, o cadena vacía si la fecha no es válida
 * (para que la UI simplemente no pinte nada en vez de mostrar "Invalid Date").
 */
export function fechaResena(iso?: string | null, ahora: Date = new Date()): string {
  if (!iso) return ''

  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  // Diferencia en días de CALENDARIO (no en horas), para que una reseña de
  // anoche a las 23:00 diga "ayer" y no "hace 0 días".
  const aDia = (x: Date) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())
  const dias = Math.floor((aDia(ahora) - aDia(d)) / MS_DIA)

  // Fecha futura (desfase de reloj / zona horaria): la tratamos como hoy.
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`

  if (dias < 30) {
    const semanas = Math.floor(dias / 7)
    return semanas === 1 ? 'hace 1 semana' : `hace ${semanas} semanas`
  }

  const meses =
    (ahora.getFullYear() - d.getFullYear()) * 12 + (ahora.getMonth() - d.getMonth())

  if (meses < 12) {
    const m = Math.max(1, meses)
    return m === 1 ? 'hace 1 mes' : `hace ${m} meses`
  }

  return `${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`
}

/** Valor para el atributo `dateTime` de <time> (accesibilidad y SEO). */
export function fechaIso(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}
