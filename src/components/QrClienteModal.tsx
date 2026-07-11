import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { X, Loader2, QrCode } from 'lucide-react'
import { fidelizacionService, type Monedero } from '@/services/fidelizacionService'

/**
 * Muestra el QR de la Tarjeta de Fidelización de un cliente para que lo escaneen
 * en el mostrador (o el cliente lo capture). El QR codifica el `codigoQr` único
 * del monedero. Útil como identificación mientras no esté la tarjeta en Wallet.
 */
export function QrClienteModal({ idCliente, onClose }: { idCliente: number; onClose: () => void }) {
  const [monedero, setMonedero] = useState<Monedero | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fidelizacionService.getMonedero(idCliente)
      .then(setMonedero)
      .finally(() => setCargando(false))
  }, [idCliente])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700"><QrCode size={16} /> Tarjeta de Fidelización</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {cargando ? (
          <div className="py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : !monedero ? (
          <p className="py-8 text-sm text-gray-400">Este cliente aún no tiene puntos.</p>
        ) : (
          <>
            <div className="flex justify-center py-2">
              <QRCodeCanvas value={monedero.codigoQr} size={220} includeMargin />
            </div>
            <p className="mt-2 font-medium text-gray-900">{monedero.nombreCliente || `Cliente #${monedero.idCliente}`}</p>
            <p className="text-sm text-gray-500">{monedero.nivelNombre || 'Sin nivel'} · {monedero.saldoPuntos} pts</p>
            <p className="mt-3 text-[11px] text-gray-400">Muestra este código en el mostrador para identificarte y canjear.</p>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
