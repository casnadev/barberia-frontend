import { toast } from 'sonner'
import { Confetti, Lightning, Star, TrendUp } from '@phosphor-icons/react'
import type { ResultadoFidelizacion } from '@/services/ventasService'

/**
 * Notificación de fidelización en CAJA.
 *
 * Se muestra ÚNICAMENTE cuando la venta acreditó puntos (quedó Registrada o fue
 * aprobada). El backend devuelve `venta.fidelizacion` solo en ese caso; si es null
 * o undefined, aquí no se muestra nada.
 *
 * Es puramente informativa: el saldo real vive en el ledger de Barber.pe. Cuando se
 * integre Google Wallet, la tarjeta del cliente reflejará ESTOS MISMOS datos sin
 * cambiar nada de esta lógica (Wallet es un espejo, no la fuente de verdad).
 */
export function notificarFidelizacion(f?: ResultadoFidelizacion | null) {
  if (!f || f.puntosGanados <= 0) return

  const nombre = f.nombreCliente?.trim() || 'El cliente'
  const pts = f.puntosGanados
  const promo = f.multiplicador > 1

  // --- Subió de nivel: el momento que la caja debe celebrar en voz alta ---
  if (f.subioDeNivel && f.nivelNombre) {
    toast.custom(() => (
      <div className="w-[340px] rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Confetti size={26} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="font-semibold text-amber-900">¡Felicitaciones!</p>
            <p className="mt-0.5 text-sm text-amber-900">
              {nombre} acaba de subir a <strong>Nivel {f.nivelNombre}</strong>
              {f.nivelAnterior ? ` (antes ${f.nivelAnterior})` : ''}.
            </p>
            <p className="mt-1 text-xs text-amber-800">Ya puede acceder a beneficios exclusivos.</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-amber-100 pt-2 text-xs text-amber-900">
              <span className="inline-flex items-center gap-1">
                <Star size={12} weight="fill" className="text-amber-500" />
                Ganó <strong>{pts}</strong> {pts === 1 ? 'punto' : 'puntos'}
              </span>
              <span>Saldo: <strong>{f.saldoPuntos}</strong></span>
              {promo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 font-semibold">
                  <Lightning size={11} weight="fill" /> x{f.multiplicador}
                  {f.promocionAplicada ? ` · ${f.promocionAplicada}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    ), { duration: 9000 })
    return
  }

  // --- No subió: puntos, saldo, nivel y cuánto le falta para el siguiente ---
  const faltan = f.puntosParaSiguienteNivel
  const cerca = typeof faltan === 'number' && faltan > 0 && faltan <= 50   // "muy cerca" → incentiva la recompra

  toast.custom(() => (
    <div className="w-[340px] rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <Star size={24} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {nombre} ganó {pts} {pts === 1 ? 'punto' : 'puntos'}
          </p>

          <p className="mt-0.5 text-sm text-gray-600">
            Tiene <strong className="text-gray-900">{f.saldoPuntos} puntos</strong>
            {f.nivelNombre ? <> · Nivel <strong className="text-gray-900">{f.nivelNombre}</strong></> : null}
          </p>

          {promo && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
              <Lightning size={11} weight="fill" /> x{f.multiplicador}
              {f.promocionAplicada ? ` · ${f.promocionAplicada}` : ' · puntaje multiplicado'}
            </p>
          )}

          {typeof faltan === 'number' && faltan > 0 && f.siguienteNivelNombre && (
            <p
              className={`mt-2 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs ${
                cerca ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-gray-500'
              }`}
            >
              <TrendUp size={13} weight="bold" className="mt-px shrink-0" />
              <span>
                {cerca ? 'Solo le faltan' : 'Le faltan'} <strong>{faltan} puntos</strong> para subir a{' '}
                <strong>Nivel {f.siguienteNivelNombre}</strong>.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  ), { duration: 8000 })
}
