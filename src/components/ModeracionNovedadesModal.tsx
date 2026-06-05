import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { X, ShieldCheck, Check, EyeOff, Trash2, Flag, Clock } from 'lucide-react'
import { novedadesService, type NovedadComentario, type ComentarioReportado } from '@/services/novedadesService'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.100.25:55692'
const img = (u?: string | null) => {
  if (!u || u === 'string') return ''
  return /^(https?:|data:|blob:)/.test(u) ? u : `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`
}
const fecha = (s?: string) => {
  if (!s) return ''
  try { return new Date(s).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

/**
 * Panel de moderación del muro de Novedades (Admin).
 *  - Pendientes: fotos en revisión esperando aprobación (Aprobar / Rechazar).
 *  - Reportados: comentarios marcados por la comunidad (Mantener / Ocultar / Eliminar).
 * Los stickers/gifs no pasan por aquí (se aprueban solos).
 */
export function ModeracionNovedadesModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'pendientes' | 'reportes'>('pendientes')
  const [pendientes, setPendientes] = useState<NovedadComentario[]>([])
  const [reportes, setReportes] = useState<ComentarioReportado[]>([])
  const [loading, setLoading] = useState(true)
  const [actuando, setActuando] = useState<number | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const [p, r] = await Promise.all([
        novedadesService.listarPendientes().catch(() => []),
        novedadesService.listarReportes().catch(() => []),
      ])
      setPendientes(p)
      setReportes(r)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { cargar() }, [])

  const moderar = async (id: number, estado: 'Aprobado' | 'Oculto' | 'Rechazado', exito: string) => {
    setActuando(id)
    try {
      await novedadesService.moderar(id, estado)
      setPendientes((xs) => xs.filter((x) => x.idComentario !== id))
      setReportes((xs) => xs.filter((x) => x.idComentario !== id))
      toast.success(exito)
    } catch {
      toast.error('No se pudo aplicar la acción')
    } finally {
      setActuando(null)
    }
  }

  const tabBtn = (id: 'pendientes' | 'reportes', label: string, n: number) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition ${
        tab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {n > 0 && <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>{n}</span>}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck width={18} height={18} className="text-blue-600" /> Moderación
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar"><X width={18} height={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          {tabBtn('pendientes', 'Fotos en revisión', pendientes.length)}
          {tabBtn('reportes', 'Reportados', reportes.length)}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Cargando…</p>
        ) : tab === 'pendientes' ? (
          /* ---- PENDIENTES (fotos) ---- */
          pendientes.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Clock width={36} height={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay fotos esperando revisión 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendientes.map((c) => (
                <div key={c.idComentario} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">{c.nombreCliente}</span>
                    <span className="text-xs text-gray-400">{fecha(c.fechaCreacion)}</span>
                  </div>
                  {c.comentario && <p className="text-sm text-gray-700 mb-2">{c.comentario}</p>}
                  {c.urlImagen && (
                    <img src={img(c.urlImagen)} alt="foto en revisión" className="max-h-56 rounded-lg object-cover border border-gray-100 mb-2" />
                  )}
                  <div className="flex gap-2">
                    <button
                      disabled={actuando === c.idComentario}
                      onClick={() => moderar(c.idComentario, 'Aprobado', 'Foto aprobada')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <Check width={15} height={15} /> Aprobar
                    </button>
                    <button
                      disabled={actuando === c.idComentario}
                      onClick={() => moderar(c.idComentario, 'Rechazado', 'Foto rechazada')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-rose-50 text-rose-600 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <Trash2 width={15} height={15} /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ---- REPORTADOS ---- */
          reportes.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Flag width={36} height={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay comentarios reportados 👌</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportes.map((c) => (
                <div key={c.idComentario} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">{c.nombreCliente}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                      <Flag width={12} height={12} /> {c.totalReportes} reporte{c.totalReportes === 1 ? '' : 's'}
                    </span>
                  </div>
                  {c.comentario && <p className="text-sm text-gray-700 mb-2">{c.comentario}</p>}
                  {c.urlImagen && (
                    /^(https?:|\/)/.test(c.urlImagen)
                      ? <img src={img(c.urlImagen)} alt="adjunto" className="max-h-48 rounded-lg object-cover border border-gray-100 mb-2" />
                      : <div className="text-4xl mb-2">{c.urlImagen}</div> // sticker (emoji)
                  )}
                  <div className="flex gap-2">
                    <button
                      disabled={actuando === c.idComentario}
                      onClick={() => moderar(c.idComentario, 'Aprobado', 'Comentario mantenido')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-emerald-50 text-emerald-700 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <Check width={15} height={15} /> Mantener
                    </button>
                    <button
                      disabled={actuando === c.idComentario}
                      onClick={() => moderar(c.idComentario, 'Oculto', 'Comentario ocultado')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-amber-50 text-amber-700 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <EyeOff width={15} height={15} /> Ocultar
                    </button>
                    <button
                      disabled={actuando === c.idComentario}
                      onClick={() => moderar(c.idComentario, 'Rechazado', 'Comentario eliminado')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-rose-50 text-rose-600 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <Trash2 width={15} height={15} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
