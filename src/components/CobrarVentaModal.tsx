import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Plus, Minus, Camera, Scissors } from 'lucide-react'
import { toast } from 'sonner'
import { serviciosService } from '@/services/serviciosService'
import { trabajadoresService } from '@/services/trabajadoresService'
import { panelTrabajadorService } from '@/services/panelTrabajadorService'
import { ventasService } from '@/services/ventasService'
import { mensajeError } from '@/utils/apiError'

const METODOS = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia', 'Otro']
const soles = (n?: number) => `S/ ${(Number(n) || 0).toFixed(2)}`

/**
 * Modal de venta walk-in (sin reserva), compartido por Admin y Trabajador.
 * - Trabajador: el profesional es él mismo (`lockTrabajadorId`).
 * - Admin: elige el profesional que atendió (selector).
 * Servicios agrupados por categoría. Evidencia obligatoria.
 */
export function CobrarVentaModal({ mode, lockTrabajadorId, onClose, onDone }: {
  mode: 'admin' | 'trabajador'
  lockTrabajadorId?: number
  onClose: () => void
  onDone: () => void
}) {
  const [servicios, setServicios] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [idTrabajador, setIdTrabajador] = useState<number | null>(lockTrabajadorId ?? null)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Record<number, number>>({})
  const [metodo, setMetodo] = useState('Efectivo')
  const [operacion, setOperacion] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancel = false
    const tasks: Promise<any>[] = [serviciosService.getServicios()]
    if (mode === 'admin') tasks.push(trabajadoresService.getTrabajadores())
    Promise.all(tasks).then(([svc, trabs]) => {
      if (cancel) return
      setServicios(Array.isArray(svc) ? svc.filter((s: any) => s.estado !== false) : [])
      if (mode === 'admin') {
        const activos = (Array.isArray(trabs) ? trabs : []).filter((t: any) => t.estado !== false)
        setTrabajadores(activos)
        setIdTrabajador(prev => prev ?? activos[0]?.idTrabajador ?? null)
      }
      setLoading(false)
    }).catch(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [mode])

  // Servicios agrupados por categoría
  const grupos = useMemo(() => {
    const map = new Map<string, any[]>()
    servicios.forEach(s => {
      const cat = s.nombreCategoria || 'Otros'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(s)
    })
    return Array.from(map.entries())
  }, [servicios])

  const toggle = (id: number) => setSel(prev => { const n = { ...prev }; if (n[id]) delete n[id]; else n[id] = 1; return n })
  const setQty = (id: number, q: number) => setSel(prev => ({ ...prev, [id]: Math.max(1, q) }))
  const seleccionadas = servicios.filter(s => sel[s.idServicio])
  const total = seleccionadas.reduce((a, s) => a + (Number(s.precioBase) || 0) * (sel[s.idServicio] || 1), 0)

  const subir = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { const url = await panelTrabajadorService.subirEvidencia(file); setEvidencia(url); toast.success('Evidencia subida') }
    catch { toast.error('No se pudo subir la imagen') } finally { setSubiendo(false) }
  }

  const confirmar = async () => {
    if (seleccionadas.length === 0) { toast.error('Selecciona al menos un servicio'); return }
    if (!idTrabajador) { toast.error('Selecciona el profesional'); return }
    if (!evidencia) { toast.error('Adjunta la evidencia del pago'); return }
    setSaving(true)
    try {
      await ventasService.registrarWalkIn({
        nombreCliente: nombreCliente.trim() || undefined,
        detalles: seleccionadas.map(s => ({ idServicio: s.idServicio, idTrabajador: idTrabajador!, cantidad: sel[s.idServicio] || 1 })),
        metodoPago: metodo,
        numeroOperacion: operacion.trim() || undefined,
        rutaImagenEvidencia: evidencia,
      })
      toast.success(mode === 'admin' ? 'Venta registrada' : 'Venta registrada · enviada para aprobación')
      onDone()
    } catch (e: any) { toast.error(mensajeError(e, 'No se pudo registrar la venta')) } finally { setSaving(false) }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Cobrar venta sin reserva</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-gray-400"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500 mx-auto mb-2" /> Cargando…</div>
        ) : (
          <div className="space-y-3">
            {mode === 'admin' && (
              <div><label className="text-xs text-gray-500">Profesional</label>
                <select className={field} value={idTrabajador ?? ''} onChange={e => setIdTrabajador(Number(e.target.value))}>
                  {trabajadores.length === 0 && <option value="">Sin trabajadores</option>}
                  {trabajadores.map(t => <option key={t.idTrabajador} value={t.idTrabajador}>{t.nombreCompleto}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500">Servicios <span className="text-gray-400">(puedes elegir varios)</span></label>
              <div className="mt-1 max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
                {servicios.length === 0 && <p className="text-sm text-gray-400 p-3 flex items-center gap-2"><Scissors className="w-4 h-4" /> No hay servicios en esta sede.</p>}
                {grupos.map(([cat, items]) => (
                  <div key={cat}>
                    <div className="sticky top-0 z-10 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">{cat}</div>
                    <div className="divide-y divide-gray-100">
                      {items.map(s => {
                        const on = !!sel[s.idServicio]
                        return (
                          <div key={s.idServicio} className="flex items-center gap-2 p-2.5">
                            <button onClick={() => toggle(s.idServicio)} className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300'}`}>{on && <Check className="w-3.5 h-3.5" />}</button>
                            <button onClick={() => toggle(s.idServicio)} className="flex-1 min-w-0 text-left">
                              <span className="block text-sm font-medium text-gray-900 truncate">{s.nombre}</span>
                              <span className="block text-xs text-gray-500">{soles(Number(s.precioBase) || 0)}</span>
                            </button>
                            {on && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => setQty(s.idServicio, (sel[s.idServicio] || 1) - 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="w-6 text-center text-sm font-semibold">{sel[s.idServicio]}</span>
                                <button onClick={() => setQty(s.idServicio, (sel[s.idServicio] || 1) + 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div><label className="text-xs text-gray-500">Cliente (opcional)</label><input className={field} placeholder="Nombre del cliente a pie" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} /></div>

            <div><label className="text-xs text-gray-500">Método de pago</label>
              <select className={field} value={metodo} onChange={e => setMetodo(e.target.value)}>{METODOS.map(m => <option key={m} value={m}>{m}</option>)}</select>
            </div>
            {metodo !== 'Efectivo' && <div><label className="text-xs text-gray-500">N° de operación (opcional)</label><input className={field} value={operacion} onChange={e => setOperacion(e.target.value)} /></div>}

            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Evidencia del pago <span className="text-rose-500 font-medium">(obligatoria)</span></label>
              <input type="file" accept="image/*" onChange={subir} className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:px-3 file:py-1.5 file:text-sm file:font-medium" />
              {subiendo && <p className="text-xs text-gray-400 mt-1">Subiendo…</p>}
              {evidencia && <img src={evidencia} alt="evidencia" className="mt-2 rounded-lg max-h-32 border border-gray-200" />}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-bold text-gray-900">{soles(total)}</span>
            </div>
            <button onClick={confirmar} disabled={saving || subiendo || seleccionadas.length === 0 || !evidencia || !idTrabajador} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">
              {saving ? 'Registrando…' : 'Registrar venta'}
            </button>
            <p className="text-[11px] text-gray-400 text-center">{mode === 'admin' ? 'Se registra como venta aceptada.' : 'Quedará pendiente de aprobación del administrador.'}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
