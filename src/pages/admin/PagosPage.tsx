import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, X, User, Loader2, Camera, Receipt, History } from 'lucide-react'
import { toast } from 'sonner'
import { pagosService, type ResumenComisiones, type PagoTrabajador } from '@/services/pagosService'
import { buildImageUrl } from '@/services/apiClient'
import { fechaHoraPeru } from '@/utils/fecha'
import { FiltroTrabajador } from '@/components/FiltroTrabajador'

const METODOS = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia', 'Otro']
const money = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`

/** Avatar del trabajador: foto si existe, ícono genérico si no. */
function Avatar({ url, nombre, size = 44 }: { url?: string | null; nombre?: string; size?: number }) {
  const src = url ? buildImageUrl(url) : ''
  return src ? (
    <img
      src={src}
      alt={nombre || 'Trabajador'}
      style={{ width: size, height: size }}
      className="rounded-full object-cover bg-gray-100 shrink-0"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0"
    >
      <User width={size * 0.45} height={size * 0.45} />
    </div>
  )
}

export function PagosPage() {
  const [pagar, setPagar] = useState<ResumenComisiones | null>(null)
  const [historial, setHistorial] = useState<ResumenComisiones | null>(null)
  const [verImagen, setVerImagen] = useState<string | null>(null)
  const [idTrabFiltro, setIdTrabFiltro] = useState<number | null>(null)

  // Resumen de comisiones cacheado (navegación instantánea al revisitar).
  const {
    data: lista = [],
    isLoading: loading,
    refetch,
  } = useQuery<ResumenComisiones[]>({
    queryKey: ['pagos', 'resumen-comisiones'],
    queryFn: () => pagosService.getResumenComisiones(),
  })
  const cargar = () => refetch()

  // Chips de filtro derivados del propio resumen (ya trae foto + nombre).
  const trabajadores = useMemo(
    () => lista.map(t => ({ idTrabajador: t.idTrabajador, nombreCompleto: t.nombreTrabajador, urlFotoPerfil: t.urlFotoPerfil })),
    [lista],
  )
  const listaVisible = useMemo(
    () => (idTrabFiltro == null ? lista : lista.filter(t => t.idTrabajador === idTrabFiltro)),
    [lista, idTrabFiltro],
  )

  const totalPendiente = useMemo(
    () => listaVisible.reduce((s, t) => s + (t.comisionesTotalPendiente || 0), 0),
    [listaVisible],
  )

  return (
    <>
      {/* Total pendiente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Pendiente total por pagar</p>
          <p className="text-3xl font-extrabold text-rose-600 mt-1">{money(totalPendiente)}</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
          <Wallet width={26} height={26} />
        </div>
      </div>

      {/* Filtro por trabajador */}
      {trabajadores.length > 0 && (
        <div className="mb-4">
          <FiltroTrabajador trabajadores={trabajadores} value={idTrabFiltro} onChange={setIdTrabFiltro} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : listaVisible.length === 0 ? (
        <p className="text-gray-500 text-sm py-10 text-center">No hay comisiones registradas todavía.</p>
      ) : (
        <div className="grid gap-3">
          {listaVisible.map(t => {
            const pendiente = t.comisionesTotalPendiente || 0
            return (
              <div key={t.idTrabajador} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                {/* Zona clickeable: abre el historial de pagos del trabajador */}
                <button
                  onClick={() => setHistorial(t)}
                  className="flex items-center gap-4 min-w-0 flex-1 text-left group"
                  title="Ver historial de pagos"
                >
                  <Avatar url={t.urlFotoPerfil} nombre={t.nombreTrabajador} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition">
                      {t.nombreTrabajador}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Calculado {money(t.comisionesTotalCalculado)} · Pagado {money(t.comisionesTotalPagado)}
                      {t.cantidadDetallesPendientes > 0 && ` · ${t.cantidadDetallesPendientes} servicio${t.cantidadDetallesPendientes === 1 ? '' : 's'} sin liquidar`}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 mt-1 opacity-80 group-hover:opacity-100">
                      <History width={13} height={13} /> Ver historial
                    </span>
                  </div>
                </button>

                <div className="text-right shrink-0">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Pendiente</p>
                  <p className={`font-bold ${pendiente > 0.005 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(pendiente)}</p>
                </div>
                <button
                  onClick={() => setPagar(t)}
                  disabled={pendiente <= 0.005}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-default text-white rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Pagar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {pagar && (
        <PagoModal
          trabajador={pagar}
          onClose={() => setPagar(null)}
          onDone={async () => { setPagar(null); await cargar() }}
        />
      )}

      {historial && (
        <HistorialPagosModal
          trabajador={historial}
          onClose={() => setHistorial(null)}
          onVerImagen={setVerImagen}
        />
      )}

      {verImagen && <ImagenViewer url={verImagen} onClose={() => setVerImagen(null)} />}
    </>
  )
}

// =====================================================================
// MODAL: Registrar pago (con evidencia opcional para TODOS los métodos)
// =====================================================================
function PagoModal({ trabajador, onClose, onDone }: { trabajador: ResumenComisiones; onClose: () => void; onDone: () => void }) {
  const pendiente = trabajador.comisionesTotalPendiente || 0
  const [monto, setMonto] = useState(pendiente.toFixed(2))
  const [metodo, setMetodo] = useState('Efectivo')
  const [obs, setObs] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'

  // Yape/Plin exigen evidencia en el backend; el resto es opcional (recomendada).
  const evidenciaObligatoria = metodo === 'Yape' || metodo === 'Plin'

  const subir = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try {
      const url = await pagosService.subirEvidencia(file)
      if (!url) throw new Error('sin url')
      setEvidencia(url)
      toast.success('Evidencia subida')
    } catch {
      toast.error('No se pudo subir la imagen')
    } finally {
      setSubiendo(false)
    }
  }

  const guardar = async () => {
    const n = Number(monto)
    if (!n || n <= 0) return toast.error('Ingresa un monto válido')
    if (n - pendiente > 0.005) return toast.error(`El monto no puede superar el pendiente (${money(pendiente)})`)
    if (evidenciaObligatoria && !evidencia) return toast.error(`El método ${metodo} requiere foto de evidencia`)
    setSaving(true)
    try {
      await pagosService.registrarPago({
        idTrabajador: trabajador.idTrabajador,
        montoPagado: n,
        metodoPago: metodo,
        observacion: obs.trim() || undefined,
        rutaImagenEvidencia: evidencia || undefined,
      })
      toast.success('Pago registrado')
      onDone()
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || 'No se pudo registrar el pago')
    } finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-3">
          <Avatar url={trabajador.urlFotoPerfil} nombre={trabajador.nombreTrabajador} size={40} />
          <h3 className="text-base font-semibold text-gray-900 flex-1 truncate">Pagar a {trabajador.nombreTrabajador}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X width={20} height={20} /></button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600">
          Pendiente actual: <strong className="text-rose-600">{money(pendiente)}</strong>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Monto a pagar (S/)</label>
            <input className={field} value={monto} onChange={e => setMonto(e.target.value)} inputMode="decimal" type="number" min={0} max={pendiente} step="0.01" />
            <button onClick={() => setMonto(pendiente.toFixed(2))} className="text-xs text-blue-600 mt-1">Pagar todo el pendiente</button>
          </div>
          <div>
            <label className="text-xs text-gray-500">Método</label>
            <select className={field} value={metodo} onChange={e => setMetodo(e.target.value)}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Observación (opcional)</label>
            <input className={field} value={obs} onChange={e => setObs(e.target.value)} />
          </div>

          {/* Evidencia — disponible para todos los métodos */}
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1.5">
              <Camera width={14} height={14} /> Evidencia del pago{' '}
              {evidenciaObligatoria
                ? <span className="text-rose-500 font-semibold">· obligatoria</span>
                : <span className="text-gray-400">· recomendada</span>}
            </label>
            {evidencia ? (
              <div className="relative mt-1 inline-block">
                <img src={buildImageUrl(evidencia)} alt="evidencia" className="rounded-xl max-h-36 border border-gray-200" />
                <button onClick={() => setEvidencia('')} aria-label="Quitar" className="absolute -top-2 -right-2 grid place-items-center w-6 h-6 rounded-full bg-white shadow border border-gray-200 text-gray-500 hover:text-rose-500">
                  <X width={12} height={12} />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition">
                <Camera width={22} height={22} className="text-gray-400" />
                <span className="text-sm text-gray-500">{subiendo ? 'Subiendo…' : 'Toca para adjuntar la foto del pago'}</span>
                <input type="file" accept="image/*" onChange={subir} className="hidden" />
              </label>
            )}
          </div>

          <button
            onClick={guardar}
            disabled={saving || subiendo}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold"
          >
            {saving ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// MODAL: Historial de pagos del trabajador (fecha+hora Perú, monto, método, evidencia)
// =====================================================================
function HistorialPagosModal({
  trabajador,
  onClose,
  onVerImagen,
}: {
  trabajador: ResumenComisiones
  onClose: () => void
  onVerImagen: (url: string) => void
}) {
  const { data: pagos = [], isLoading } = useQuery<PagoTrabajador[]>({
    queryKey: ['pagos', 'historial', trabajador.idTrabajador],
    queryFn: () => pagosService.getPagosTrabajador(trabajador.idTrabajador),
  })

  const totalPagado = useMemo(() => pagos.reduce((s, p) => s + (p.montoPagado || 0), 0), [pagos])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Avatar url={trabajador.urlFotoPerfil} nombre={trabajador.nombreTrabajador} size={40} />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 truncate">Pagos de {trabajador.nombreTrabajador}</h3>
            <p className="text-xs text-gray-500">Total pagado histórico: <strong className="text-emerald-600">{money(totalPagado)}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X width={20} height={20} /></button>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : pagos.length === 0 ? (
            <p className="text-gray-500 text-sm py-10 text-center">Este trabajador aún no tiene pagos registrados.</p>
          ) : (
            <div className="grid gap-2.5">
              {pagos.map(p => (
                <div key={p.idPago} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                  {/* Thumbnail de evidencia clickeable */}
                  {p.rutaImagenEvidencia ? (
                    <button
                      onClick={() => onVerImagen(buildImageUrl(p.rutaImagenEvidencia))}
                      className="shrink-0"
                      title="Ver evidencia"
                    >
                      <img
                        src={buildImageUrl(p.rutaImagenEvidencia)}
                        alt="evidencia"
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-blue-400 transition"
                      />
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-50 text-gray-300 flex items-center justify-center shrink-0" title="Sin evidencia">
                      <Receipt width={20} height={20} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{money(p.montoPagado)}</p>
                    <p className="text-xs text-gray-500">
                      {fechaHoraPeru(p.fechaPago)} · {p.metodoPago}
                    </p>
                    {p.observacion && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.observacion}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Visor de imagen a pantalla completa (evidencia ampliada)
// =====================================================================
function ImagenViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white" aria-label="Cerrar">
        <X width={28} height={28} />
      </button>
      <img
        src={url}
        alt="Evidencia"
        onClick={e => e.stopPropagation()}
        className="max-w-full max-h-full rounded-xl object-contain"
      />
    </div>
  )
}
