import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { X, Loader2, ScanLine, RotateCcw } from 'lucide-react'
import { fidelizacionService, type Monedero } from '@/services/fidelizacionService'
import { MonederoClienteCard } from './MonederoClienteCard'

const READER_ID = 'fidel-qr-reader'

/**
 * Escáner de la Tarjeta de Fidelización para el mostrador. Abre la cámara, lee el
 * QR (codigoQr del monedero), resuelve el cliente vía GET /qr/{codigo} y muestra
 * su monedero con el botón Canjear (reusa MonederoClienteCard).
 *
 * Requiere la dependencia `html5-qrcode` (npm i html5-qrcode).
 */
export function EscanearMonederoModal({ onClose }: { onClose: () => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [escaneando, setEscaneando] = useState(true)
  const [resolviendo, setResolviendo] = useState(false)
  const [cliente, setCliente] = useState<Monedero | null>(null)
  const [error, setError] = useState<string | null>(null)

  const detener = async () => {
    const s = scannerRef.current
    if (s) {
      try { await s.stop() } catch { /* ya detenido */ }
      try { await s.clear() } catch { /* noop */ }
      scannerRef.current = null
    }
  }

  const iniciar = async () => {
    setError(null)
    setCliente(null)
    setEscaneando(true)
    // pequeño delay para que el contenedor exista en el DOM
    await new Promise((r) => setTimeout(r, 50))
    try {
      const html5 = new Html5Qrcode(READER_ID)
      scannerRef.current = html5
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        async (texto) => {
          // Éxito: detener y resolver.
          await detener()
          setEscaneando(false)
          setResolviendo(true)
          try {
            const m = await fidelizacionService.getPorQr(texto.trim())
            if (m) setCliente(m)
            else setError('Tarjeta no reconocida o de otra sede.')
          } catch {
            setError('No se pudo leer la tarjeta.')
          } finally {
            setResolviendo(false)
          }
        },
        () => { /* frame sin QR: ignorar */ }
      )
    } catch {
      setEscaneando(false)
      setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
    }
  }

  useEffect(() => {
    iniciar()
    return () => { detener() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reintentar = () => { toast.dismiss(); iniciar() }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700"><ScanLine size={16} /> Escanear tarjeta</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Cámara */}
        {escaneando && (
          <div className="overflow-hidden rounded-xl bg-black">
            <div id={READER_ID} className="w-full [&_video]:w-full [&_video]:rounded-xl" />
          </div>
        )}

        {resolviendo && (
          <div className="py-10 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /><p className="mt-2 text-sm">Buscando cliente…</p></div>
        )}

        {error && (
          <div className="py-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={reintentar} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">
              <RotateCcw size={15} /> Reintentar
            </button>
          </div>
        )}

        {/* Cliente resuelto: monedero + canje */}
        {cliente && (
          <div>
            <MonederoClienteCard idCliente={cliente.idCliente} />
            <button onClick={reintentar} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              <ScanLine size={15} /> Escanear otra tarjeta
            </button>
          </div>
        )}

        {escaneando && !error && (
          <p className="mt-3 text-center text-[11px] text-gray-400">Apunta la cámara al QR de la tarjeta del cliente.</p>
        )}
      </div>
    </div>,
    document.body
  )
}
