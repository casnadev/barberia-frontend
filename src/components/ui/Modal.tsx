import { useEffect, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'

/**
 * T11 — SHELL COMÚN DE TODOS LOS MODALES.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ARREGLA
 * ───────────────────────────────────────────────────────────────────────────
 * Cada modal de la app tenía su propia maquetación, y todas compartían el mismo
 * fallo: los botones iban al FINAL DEL SCROLL. En móvil, para pulsar "Guardar"
 * había que bajar el formulario entero. En Venta rápida ni siquiera veías el
 * total mientras elegías servicios.
 *
 * Aquí el modal es una columna de tres piezas fijas:
 *
 *     ┌─────────────────────────────┐
 *     │ HEADER   (fijo)             │  icono + título + subtítulo + cerrar
 *     ├─────────────────────────────┤
 *     │ BODY     (lo único que      │  ← flex: 1, overflow-y: auto
 *     │           scrollea)         │
 *     ├─────────────────────────────┤
 *     │ FOOTER   (fijo)             │  botones SIEMPRE visibles
 *     └─────────────────────────────┘
 *
 * El truco es `max-height: 90dvh` + `flex-direction: column`: el body absorbe lo
 * que sobre y scrollea SOLO ÉL. El modal nunca crece más que la pantalla, así que
 * el footer no puede salirse.
 *
 * `dvh` y no `vh`: en móvil, `100vh` NO descuenta la barra de direcciones de
 * Safari/Chrome, así que el footer queda debajo de ella — invisible. `dvh` sí.
 * Es exactamente el bug que estamos arreglando, y usar `vh` lo reintroduciría.
 */

export type TonoModal = 'accent' | 'success' | 'pro' | 'danger'

const TONOS: Record<TonoModal, { bg: string; fg: string }> = {
  accent: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  success: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  pro: { bg: 'bg-violet-50', fg: 'text-violet-600' },
  danger: { bg: 'bg-rose-50', fg: 'text-rose-600' },
}

interface Props {
  open: boolean
  onClose: () => void

  titulo: string
  subtitulo?: string
  /** Icono de la pastilla del header. */
  icono?: ReactNode
  /** Color de la pastilla. accent=azul (editar) · success=verde (dinero) · pro=violeta (novedades). */
  tono?: TonoModal

  /** Contenido del footer. Si no se pasa, no se pinta la franja. */
  footer?: ReactNode

  /**
   * Barra de pasos (0-1). Solo la usa Venta rápida en móvil.
   * Ej: [true, false, false] = paso 1 de 3.
   */
  pasos?: boolean[]

  /** Botón "atrás" en el header (para los pasos). */
  onAtras?: () => void

  /** Ancho máximo. Default 'md'. */
  ancho?: 'sm' | 'md' | 'lg'

  children: ReactNode
}

const ANCHOS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Modal({
  open, onClose, titulo, subtitulo, icono, tono = 'accent',
  footer, pasos, onAtras, ancho = 'md', children,
}: Props) {
  // Escape cierra. Y se bloquea el scroll del body: si no, al scrollear dentro
  // del modal en móvil, el fondo se mueve detrás (scroll chaining) y al cerrar
  // apareces en otro sitio de la página.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const t = TONOS[tono]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      {/*
        En móvil el modal se pega ABAJO (items-end) y solo redondea las esquinas de
        arriba: es un bottom-sheet. El pulgar llega al footer sin estirarse.
        En desktop (sm:) se centra como un modal normal.
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full ${ANCHOS[ancho]} max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}
      >
        {/* ── HEADER (fijo) ── */}
        <div className="shrink-0 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
          <div className="flex items-center gap-2.5">
            {onAtras ? (
              <button
                onClick={onAtras}
                aria-label="Atrás"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-gray-500 transition hover:bg-gray-200"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : icono ? (
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.bg} ${t.fg}`}>
                {icono}
              </span>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{titulo}</p>
              {subtitulo && (
                <p className="truncate text-[11px] text-gray-500">{subtitulo}</p>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
            >
              <X size={15} weight="bold" />
            </button>
          </div>

          {/* Barra de pasos. Mismo patrón que el flujo de reserva pública. */}
          {pasos && pasos.length > 0 && (
            <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
              {pasos.map((activo, i) => (
                <span
                  key={i}
                  className={`h-[3px] flex-1 rounded-full transition-colors ${
                    activo ? 'bg-gray-900' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── BODY (lo ÚNICO que scrollea) ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>

        {/* ── FOOTER (fijo) ──
             pb con safe-area: en iPhone, la barra de gestos se come el botón. */}
        {footer && (
          <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
