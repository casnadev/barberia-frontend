import { useMemo, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer, Copy, QrCode, Star } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { buildImageUrl } from '@/services/apiClient'

/**
 * CARTEL DEL LOCAL — el QR del NEGOCIO.
 *
 * Es el MISMO para todos los clientes: por eso NO puede contener una tarjeta ya
 * hecha. Apunta a barber.pe/unirme/{idSede}; en cada escaneo abre la landing de
 * alta y, al enviarla, se crea un Cliente REAL + su monedero NUEVO.
 *
 * El otro QR (el del CLIENTE, dentro de su monedero) es el que escanea el
 * barbero en cada visita. No confundirlos.
 *
 * Se imprime con la hoja de estilos de impresión de abajo: al dar a Imprimir,
 * el navegador oculta todo el panel y deja solo el cartel.
 */
export function QrInscripcionModal({
  urlInscripcion, nombreNegocio, logo, color, onClose,
}: {
  /** Ruta relativa que devuelve el backend: /unirme/{idSede} */
  urlInscripcion: string
  nombreNegocio: string
  logo?: string | null
  color?: string
  onClose: () => void
}) {
  const cartelRef = useRef<HTMLDivElement>(null)

  // URL absoluta que se codifica en el QR. Se arma sobre el host del panel
  // (barber.pe), que es donde vive la ruta pública /unirme/:idSede.
  const urlAbsoluta = useMemo(() => {
    if (!urlInscripcion) return ''
    if (/^https?:\/\//i.test(urlInscripcion)) return urlInscripcion
    return `${window.location.origin}${urlInscripcion.startsWith('/') ? '' : '/'}${urlInscripcion}`
  }, [urlInscripcion])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(urlAbsoluta)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  if (!urlAbsoluta) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center">
          <QrCode size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-600">
            Guarda el programa una vez para generar el QR de tu local.
          </p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
            Entendido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:p-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] print:hidden" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:shadow-none">
        {/* Header (no se imprime) */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 print:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <QrCode size={20} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight text-gray-900">QR de inscripción</h3>
            <p className="text-xs leading-tight text-gray-400">Imprímelo y cuélgalo en tu local</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 print:overflow-visible print:p-0">
          {/* ── EL CARTEL ── */}
          <div
            ref={cartelRef}
            id="cartel-qr-barberpe"
            className="overflow-hidden rounded-2xl border border-gray-200 text-center"
          >
            {/* Cabecera con el color de la marca */}
            <div className="px-6 pt-6 pb-5" style={{ background: color || '#111827' }}>
              {logo ? (
                <img src={buildImageUrl(logo)} alt="" className="mx-auto mb-3 h-16 w-16 rounded-xl bg-white/95 object-contain p-1" />
              ) : (
                <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-xl bg-white/25 text-2xl font-black text-white">
                  {(nombreNegocio || 'B').slice(0, 1).toUpperCase()}
                </div>
              )}
              <p className="text-xl font-black uppercase leading-tight tracking-wide text-white">
                {nombreNegocio}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white">
                <Star size={11} weight="fill" /> Programa de fidelización
              </p>
            </div>

            {/* Cuerpo */}
            <div className="bg-white px-6 pb-6 pt-5">
              <div className="flex justify-center">
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <QRCodeSVG value={urlAbsoluta} size={188} level="M" marginSize={0} />
                </div>
              </div>

              <p className="mt-4 text-lg font-black" style={{ color: color || '#111827' }}>Escanea y acumula puntos</p>
              <p className="mx-auto mt-1 max-w-[16rem] text-xs leading-relaxed text-gray-500">
                Apunta con la cámara de tu celular. Te inscribes una sola vez, en 10 segundos.
                Sin apps, sin descargar nada.
              </p>

              <p className="mt-4 border-t border-gray-100 pt-3 text-[10px] tracking-wide text-gray-300">barber.pe</p>
            </div>
          </div>

          {/* Acciones (no se imprimen) */}
          <div className="mt-4 space-y-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              <Printer size={16} weight="fill" /> Imprimir cartel
            </button>
            <button
              onClick={copiar}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Copy size={16} /> Copiar enlace
            </button>
            {/* T10 — Fuera la URL cruda.
                Mostraba "http://localhost:5173/unirme/2040" a pelo debajo de los botones.
                No aporta nada: el QR ya la lleva dentro y "Copiar enlace" ya la da. Lo
                único que hacía era ensuciar el modal y filtrar un id interno de sede.
                Si alguien la necesita, el botón de copiar está justo encima. */}
          </div>
        </div>
      </div>

      {/* Al imprimir: solo el cartel, a página completa. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cartel-qr-barberpe, #cartel-qr-barberpe * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #cartel-qr-barberpe {
            position: absolute;
            top: 0; left: 0; right: 0;
            margin: 24px auto;
            width: 480px;
          }
        }
      `}</style>
    </div>
  )
}
