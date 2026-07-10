/**
 * Formateo de fechas/horas en hora de Perú (America/Lima, UTC-5).
 *
 * Todas las fechas "instante" (fechaVenta, fechaPago, fechaCreacion, etc.) las
 * devuelve el backend en UTC con "Z" (ver UtcDateTimeConverter.cs). Estas
 * funciones las convierten SIEMPRE a hora de Perú fijando `timeZone`, de modo
 * que se ven igual de correctas sin importar la zona horaria del dispositivo.
 *
 * NO usar estas funciones para fechas "de calendario" tipo "yyyy-mm-dd"
 * (fechaReserva de una cita): esas no tienen hora ni zona y se muestran tal cual.
 */

const TZ = 'America/Lima'
const LOCALE = 'es-PE'

/** Convierte cualquier entrada (string ISO, Date, número) a Date. Null-safe. */
function toDate(input?: string | number | Date | null): Date | null {
  if (input === null || input === undefined || input === '') return null
  const d = input instanceof Date ? input : new Date(input)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Fecha + hora en Perú. Ej: "15 ene, 02:30 p. m."
 * Es el formato por defecto para historiales (ventas, pagos, movimientos).
 */
export function fechaHoraPeru(
  input?: string | number | Date | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(input)
  if (!d) return ''
  try {
    return d.toLocaleString(LOCALE, {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      ...opts,
    })
  } catch {
    return ''
  }
}

/** Solo fecha en Perú. Ej: "15 ene 2025". */
export function fechaPeru(
  input?: string | number | Date | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(input)
  if (!d) return ''
  try {
    return d.toLocaleDateString(LOCALE, {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...opts,
    })
  } catch {
    return ''
  }
}

/** Solo hora en Perú. Ej: "02:30 p. m." */
export function horaPeru(
  input?: string | number | Date | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(input)
  if (!d) return ''
  try {
    return d.toLocaleTimeString(LOCALE, {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      ...opts,
    })
  } catch {
    return ''
  }
}

/** Fecha larga con día de semana en Perú. Ej: "miércoles, 15 de enero". */
export function fechaLargaPeru(input?: string | number | Date | null): string {
  const d = toDate(input) ?? new Date()
  try {
    return d.toLocaleDateString(LOCALE, {
      timeZone: TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return ''
  }
}

/**
 * ¿La cita ya llegó a su hora de inicio? (Perú = UTC-5)
 * Se usa para NO permitir "Atender" antes de tiempo: el botón se bloquea y el
 * aviso sale al instante, sin abrir el modal ni pedir evidencia (Tarea 3).
 * fechaReserva: 'YYYY-MM-DD' (o ISO). horaInicio: 'HH:mm' o 'HH:mm:ss'.
 * Si faltan datos, devuelve true (no bloquea).
 */
export function citaYaEmpezo(fechaReserva?: string | null, horaInicio?: string | null): boolean {
  if (!fechaReserva || !horaInicio) return true
  const fecha = String(fechaReserva).slice(0, 10)
  const hora = String(horaInicio).slice(0, 5)
  const inicioPeru = new Date(`${fecha}T${hora}:00-05:00`)
  if (isNaN(inicioPeru.getTime())) return true
  return Date.now() >= inicioPeru.getTime()
}

/** Mensaje estándar cuando se intenta atender antes de la hora. */
export const MSG_CITA_NO_LLEGA =
  'Aún no llega la fecha y hora de esta cita. Podrás atenderla recién a esa hora.'
