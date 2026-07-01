import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

type SeccionSheetProps = {
  open: boolean
  onClose: () => void
  titulo: string
  subtitulo?: string
  children: ReactNode
  /** Pie fijo de la hoja (p. ej. el botón Guardar). Si se omite, no hay pie. */
  footer?: ReactNode
}

/**
 * Contenedor de edición enfocado, mobile-first.
 * - Mobile (<640px): bottom-sheet a pantalla casi completa (rounded-t).
 * - Desktop (>=640px): modal centrado.
 * Sigue el mismo patrón que MiPerfilAdminModal (Tailwind + createPortal + Escape),
 * pero con cuerpo desplazable y un pie fijo (sticky) para el botón Guardar.
 */
export default function SeccionSheet({
  open,
  onClose,
  titulo,
  subtitulo,
  children,
  footer,
}: SeccionSheetProps) {
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'   // bloquea el scroll de fondo
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            className="relative bg-white w-full sm:max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">{titulo}</h3>
                {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 shrink-0 -mr-1"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <div
                className="shrink-0 border-t border-gray-100 px-5 py-3 bg-white"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
