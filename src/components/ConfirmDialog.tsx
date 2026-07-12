import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Warning as AlertTriangle } from '@phosphor-icons/react'

/**
 * Diálogo de confirmación reutilizable, azul/blanco, para reemplazar el
 * `window.confirm()` nativo del navegador en TODA la app.
 *
 * Uso:
 *   import { confirmDialog } from '@/components/ConfirmDialog'
 *   if (!(await confirmDialog('¿Eliminar esto?'))) return
 *   // o con opciones:
 *   const ok = await confirmDialog({
 *     title: 'Cancelar cita', message: '¿Deseas cancelar esta cita?',
 *     confirmText: 'Sí, cancelar', cancelText: 'Volver', tone: 'danger',
 *   })
 *
 * Requiere montar <ConfirmHost /> una sola vez en la raíz (App.tsx).
 */

export type ConfirmOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: 'default' | 'danger'
}

type Pending = { opts: ConfirmOptions; resolve: (v: boolean) => void }

let pushDialog: ((opts: ConfirmOptions) => Promise<boolean>) | null = null

export function confirmDialog(opts: ConfirmOptions | string): Promise<boolean> {
  const o: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts
  if (pushDialog) return pushDialog(o)
  // Fallback si el host aún no está montado.
  return Promise.resolve(window.confirm(o.message))
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null)

  useEffect(() => {
    pushDialog = (opts) => new Promise<boolean>((resolve) => setPending({ opts, resolve }))
    return () => { pushDialog = null }
  }, [])

  const close = useCallback((val: boolean) => {
    setPending((p) => { p?.resolve(val); return null })
  }, [])

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
      else if (e.key === 'Enter') close(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending, close])

  const danger = pending?.opts.tone === 'danger'

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => close(false)} />
          <motion.div
            role="alertdialog" aria-modal="true"
            className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {pending.opts.title && <h3 className="font-bold text-gray-900 leading-tight">{pending.opts.title}</h3>}
                <p className="text-sm text-gray-600 mt-0.5">{pending.opts.message}</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                {pending.opts.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition active:scale-95 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {pending.opts.confirmText || 'Aceptar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
