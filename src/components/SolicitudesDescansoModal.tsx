import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { X, Check, Prohibit, CalendarBlank, Clock } from '@phosphor-icons/react'
import { descansosAdminService, type SolicitudDescanso } from '@/services/descansosAdminService'

const fmt = (s?: string) => {
  if (!s) return ''
  try { return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return s }
}

/**
 * Bandeja del Admin: solicitudes de descanso/vacaciones de los trabajadores de
 * la sede. Permite aprobar (bloquea la agenda en esas fechas) o rechazar con un
 * motivo. El trabajador ve el resultado en su panel. (Tarea 5A)
 */
export function SolicitudesDescansoModal({ idSede, onClose, onChange }: { idSede: number; onClose: () => void; onChange?: () => void }) {
  const [items, setItems] = useState<SolicitudDescanso[]>([])
  const [loading, setLoading] = useState(true)
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [rechazando, setRechazando] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try { setItems(await descansosAdminService.listar(idSede, soloPendientes)) }
    catch { toast.error('No se pudieron cargar las solicitudes') }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [idSede, soloPendientes])

  const aprobar = async (id: number) => {
    setBusy(id)
    try { await descansosAdminService.aprobar(id); toast.success('Solicitud aprobada'); onChange?.(); await cargar() }
    catch { toast.error('No se pudo aprobar') } finally { setBusy(null) }
  }
  const confirmarRechazo = async (id: number) => {
    setBusy(id)
    try { await descansosAdminService.rechazar(id, motivo.trim() || undefined); toast.success('Solicitud rechazada'); setRechazando(null); setMotivo(''); onChange?.(); await cargar() }
    catch { toast.error('No se pudo rechazar') } finally { setBusy(null) }
  }

  const pill = (est: string) => {
    const cls = est === 'Aprobada' ? 'bg-emerald-50 text-emerald-700' : est === 'Rechazada' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
    return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{est}</span>
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg p-5 shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><CalendarBlank size={20} weight="duotone" /></span>
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">Solicitudes de descanso</h3>
              <p className="text-xs text-gray-400">Vacaciones, permisos y ausencias de tu equipo.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setSoloPendientes(true)} className={`text-xs font-medium px-3 py-1.5 rounded-full ${soloPendientes ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Pendientes</button>
          <button onClick={() => setSoloPendientes(false)} className={`text-xs font-medium px-3 py-1.5 rounded-full ${!soloPendientes ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Todas</button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl p-6 text-center">
            {soloPendientes ? 'No hay solicitudes pendientes.' : 'No hay solicitudes.'}
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <div key={s.idDescanso} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.nombreTrabajador || `Trabajador #${s.idTrabajador}`}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"><Clock size={13} /> {fmt(s.fechaInicio)} – {fmt(s.fechaFin)} · {s.tipo}</p>
                    {s.motivo && <p className="text-xs text-gray-400 mt-0.5">{s.motivo}</p>}
                    {s.estado === 'Rechazada' && s.motivoRechazo && <p className="text-xs text-rose-500 mt-0.5">Rechazado: {s.motivoRechazo}</p>}
                  </div>
                  {pill(s.estado)}
                </div>

                {s.estado === 'Pendiente' && (
                  rechazando === s.idDescanso ? (
                    <div className="mt-2.5 flex items-center gap-2">
                      <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)"
                        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
                      <button onClick={() => confirmarRechazo(s.idDescanso)} disabled={busy === s.idDescanso}
                        className="text-xs font-semibold text-white bg-rose-600 rounded-lg px-3 py-1.5 disabled:opacity-50">Rechazar</button>
                      <button onClick={() => { setRechazando(null); setMotivo('') }} className="text-xs text-gray-500">Cancelar</button>
                    </div>
                  ) : (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button onClick={() => aprobar(s.idDescanso)} disabled={busy === s.idDescanso}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 disabled:opacity-50"><Check size={14} weight="bold" /> Aprobar</button>
                      <button onClick={() => { setRechazando(s.idDescanso); setMotivo('') }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg px-3 py-1.5"><Prohibit size={14} /> Rechazar</button>
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
