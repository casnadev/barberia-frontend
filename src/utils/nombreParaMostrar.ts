/**
 * nombreParaMostrar — fuente ÚNICA de verdad para el nombre visible de una sede.
 *
 * Regla de negocio: una marca (empresa) puede tener varias sedes. El nombre que
 * ve el cliente debe distinguir la marca del local:
 *
 *   • Marca con ≥2 sedes públicas → "NombreComercial – NombreSede"
 *       ej. "Shanell Salón – Miraflores"
 *   • Marca con 1 sola sede pública → solo la marca (o la sede si no hay marca)
 *       ej. "Shanell Salón"
 *
 * Antes cada superficie (hero, headers sticky, panel SuperAdmin, directorio)
 * resolvía esto por su cuenta y se desincronizaban: el hero mostraba
 * "Shanell Salón – Miraflores" pero al scrollear el header decía solo
 * "Miraflores", y el panel maestro listaba tres "Ancón" indistinguibles.
 * Todas esas superficies deben importar de aquí.
 */

export interface SedeNombrable {
  /** Nombre de la sede = su zona/distrito (ej. "Miraflores"). */
  nombre?: string | null
  /** Nombre comercial de la marca (ej. "Shanell Salón"). */
  nombreComercial?: string | null
  /**
   * Nº de sedes PÚBLICAS de la marca. Si viene y es ≥2, se muestra
   * "Marca – Sede". Si no viene, se infiere multi = false (comportamiento
   * conservador: mostramos marca o sede, sin el guion).
   */
  totalSedesPublicasMarca?: number | null
}

/**
 * Devuelve el nombre visible de la sede según la regla de marca/sede.
 * @param opts.forzarMulti  Fuerza el formato "Marca – Sede" aunque no venga el
 *   conteo (útil en el panel SuperAdmin, donde SIEMPRE queremos distinguir).
 */
export function nombreParaMostrar(
  sede: SedeNombrable | null | undefined,
  opts?: { forzarMulti?: boolean },
): string {
  if (!sede) return ''

  const marca = (sede.nombreComercial ?? '').trim()
  const zona = (sede.nombre ?? '').trim()

  const multi =
    opts?.forzarMulti === true ||
    ((sede.totalSedesPublicasMarca ?? 1) >= 2)

  if (multi && marca && zona) return `${marca} – ${zona}`
  return marca || zona
}
