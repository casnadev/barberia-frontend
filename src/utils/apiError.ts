/**
 * Extrae el mensaje de error MÁS específico de una respuesta del backend.
 *
 * El backend (ExceptionHandlerMiddleware) devuelve siempre:
 *   { title: "<genérico>", detail: "<mensaje preciso del dominio>", status, ... }
 * El mensaje útil para el usuario es `detail` (p. ej. "No puedes marcar como
 * atendida una cita que aún no llega a su fecha y hora."). `title` es genérico
 * ("Sin permiso.", "Error de validación."). Por eso priorizamos `detail`.
 *
 * Si no hay respuesta del backend (error de red, validación de UI), cae al
 * `fallback` que pase cada pantalla.
 *
 * Uso:
 *   } catch (e) { toast.error(mensajeError(e, 'No se pudo guardar')) }
 */
export function mensajeError(error: any, fallback = 'Ocurrió un error. Intenta nuevamente.'): string {
  const data = error?.response?.data
  const msg =
    data?.detail ||      // mensaje preciso del dominio (lo que queremos)
    data?.title ||       // título genérico del backend
    data?.message ||     // por si algún endpoint usa otro formato
    error?.message       // error de red / JS

  // No mostramos textos internos feos como "Network Error" o el genérico 500.
  if (!msg || /network error|failed to fetch/i.test(msg)) return fallback
  if (/ocurrió un error inesperado/i.test(msg)) return fallback
  return msg
}
