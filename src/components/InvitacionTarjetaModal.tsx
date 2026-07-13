import { QRCodeSVG } from 'qrcode.react'
import { X, Confetti, Star, DeviceMobile } from '@phosphor-icons/react'
import type { ResultadoFidelizacion } from '@/services/ventasService'

/**
 * T6 — LA INVITACIÓN (no la obligación).
 *
 * Casi nadie va a entrar al programa escaneando el cartel del local. La inmensa
 * mayoría entra por la puerta de atrás: viene, se corta el pelo, el barbero le
 * cobra con su celular y — sin que el cliente sepa nada — ya está acumulando
 * puntos.
 *
 * El problema es que se va sin tarjeta. Y sin tarjeta no vuelve a mirar sus puntos,
 * no le llegan avisos, no ve cuánto le falta para el corte gratis.
 *
 * Esto es el puente. Justo después de cobrar, mientras el cliente sigue delante del
 * mostrador con el teléfono en la mano, el barbero le enseña la pantalla:
 *
 *     "🎉 Ya empezaste a acumular puntos. Escanea para guardar tu tarjeta."
 *
 * Escanea, y cae en SU monedero — con los puntos que acaba de ganar ya dentro.
 *
 * No hace falta ningún código de verificación: el barbero lo tiene delante y acaba
 * de cobrarle. Ya está verificado por la vía más antigua que existe.
 *
 * Si no quiere, cierra y no pasa nada: sus puntos siguen ahí, esperándolo.
 */
export function InvitacionTarjetaModal({
  fidelizacion, onClose,
}: {
  fidelizacion: ResultadoFidelizacion
  onClose: () => void
}) {
  const f = fidelizacion
  // Sin código de monedero no hay nada que ofrecer (venta anónima, por ejemplo).
  if (!f.codigoQr) return null

  const url = `${window.location.origin}/monedero/${f.codigoQr}`
  const nombre = f.nombreCliente?.trim().split(' ')[0] || 'Tu cliente'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100"
        >
          <X size={18} weight="bold" />
        </button>

        <div className="p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-500">
            <Confetti size={28} weight="fill" />
          </div>

          <h3 className="mt-3 text-lg font-bold text-gray-900">
            {nombre} ganó {f.puntosGanados} {f.puntosGanados === 1 ? 'punto' : 'puntos'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Muéstrale esta pantalla: escanea y se guarda su tarjeta.
          </p>

          <div className="mt-5 flex justify-center">
            <div className="rounded-2xl border border-gray-200 p-3">
              <QRCodeSVG value={url} size={172} level="M" marginSize={0} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Star size={13} weight="fill" className="text-amber-500" />
              <strong className="text-gray-900">{f.saldoPuntos}</strong> puntos
            </span>
            {f.nivelNombre && (
              <span>
                Nivel <strong className="text-gray-900">{f.nivelNombre}</strong>
              </span>
            )}
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-gray-400">
            <DeviceMobile size={13} weight="fill" />
            Funciona en cualquier celular, sin instalar nada.
          </p>

          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Listo
          </button>
          <p className="mt-2 text-[11px] text-gray-400">
            Si no la quiere ahora, sus puntos siguen guardados igual.
          </p>
        </div>
      </div>
    </div>
  )
}
