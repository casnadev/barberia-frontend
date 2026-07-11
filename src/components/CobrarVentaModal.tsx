import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Plus, Minus, Camera, Scissors, Receipt, CaretDown, UserCircle, Storefront } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ComboBox } from '@/components/ComboBox'
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
 *
 * Rediseño v2: iconografía Phosphor (consistente con AdminShell/SuperAdmin),
 * jerarquía visual más limpia y footer fijo con total. La LÓGICA (estado,
 * handlers, llamadas a servicios y props) es idéntica a la versión anterior.
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
  const [sinEvidencia, setSinEvidencia] = useState(false)
  const [saving, setSaving] = useState(false)
  // Tarea 4 — En modo Admin: ¿la venta la hizo el propio Admin ("Venta mía",
  // se acepta al instante) o un profesional (queda pendiente de su aprobación)?
  // Default true = venta propia del Admin (comportamiento habitual del dueño).
  const [ventaMia, setVentaMia] = useState(true)

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

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
  const nItems = seleccionadas.reduce((a, s) => a + (sel[s.idServicio] || 1), 0)

  const subir = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { const url = await panelTrabajadorService.subirEvidencia(file); setEvidencia(url); toast.success('Evidencia subida') }
    catch { toast.error('No se pudo subir la imagen') } finally { setSubiendo(false) }
  }

  const confirmar = async () => {
    if (seleccionadas.length === 0) { toast.error('Selecciona al menos un servicio'); return }
    if (!idTrabajador) { toast.error('Selecciona el profesional'); return }
    if (!evidencia && !sinEvidencia) { toast.error('Adjunta la evidencia del pago'); return }
    setSaving(true)
    try {
      // Tarea 4: el Admin solo auto-aprueba cuando es "Venta mía".
      // El Trabajador siempre envía false (el backend lo ignora igual → pendiente).
      const atribuidaAlAdmin = mode === 'admin' ? ventaMia : false
      await ventasService.registrarWalkIn({
        nombreCliente: nombreCliente.trim() || undefined,
        detalles: seleccionadas.map(s => ({ idServicio: s.idServicio, idTrabajador: idTrabajador!, cantidad: sel[s.idServicio] || 1 })),
        metodoPago: metodo,
        numeroOperacion: operacion.trim() || undefined,
        rutaImagenEvidencia: evidencia || undefined,
        permitirSinEvidencia: sinEvidencia,
        atribuidaAlAdmin,
      } as any)
      const seAcepta = mode === 'admin' && ventaMia   // única vía de auto-aprobación
      toast.success(
        seAcepta
          ? (evidencia ? 'Venta registrada' : 'Venta registrada sin evidencia')
          : (evidencia ? 'Venta enviada para aprobación' : 'Venta creada · pendiente de aprobación'))
      onDone()
    } catch (e: any) { toast.error(mensajeError(e, 'No se pudo registrar la venta')) } finally { setSaving(false) }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 outline-none transition'
  const label = 'text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5'

  const puedeGuardar = !saving && !subiendo && seleccionadas.length > 0 && (!!evidencia || sinEvidencia) && !!idTrabajador

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Receipt size={20} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 leading-tight">Venta rápida</h3>
            <p className="text-xs text-gray-400 leading-tight">Cobro sin reserva previa</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid place-items-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <X size={18} weight="bold" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-emerald-500 mx-auto mb-3" />
            Cargando…
          </div>
        ) : (
          <>
            {/* Cuerpo scrolleable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {mode === 'admin' && (
                <>
                  {/* Tarea 4 — ¿Quién realizó la venta? Decide si se acepta al instante
                      (venta propia del Admin) o queda pendiente de su aprobación
                      (venta de un profesional). */}
                  <div>
                    <label className={label}>¿Quién realizó la venta?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVentaMia(true)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${ventaMia ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/30' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        Venta mía (Admin)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVentaMia(false)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${!ventaMia ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/30' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        Venta de un profesional
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-400">
                      {ventaMia
                        ? 'Se registra como aceptada al instante.'
                        : 'Quedará pendiente de aprobación: el profesional la verá como pendiente y tú la apruebas o rechazas según la evidencia.'}
                    </p>
                  </div>

                  <div>
                    <label className={label}><UserCircle size={14} weight="duotone" /> Profesional {ventaMia && <span className="text-gray-400 font-normal">· que atendió</span>}</label>
                    <ComboBox
                      value={idTrabajador ?? ''}
                      onChange={(v) => setIdTrabajador(v === '' ? null : Number(v))}
                      opciones={trabajadores.map(t => ({ valor: t.idTrabajador, etiqueta: t.nombreCompleto }))}
                      disabled={trabajadores.length === 0}
                      inputClassName={field}
                    />
                  </div>
                </>
              )}

              {/* Servicios */}
              <div>
                <label className={label}><Scissors size={14} weight="duotone" /> Servicios <span className="text-gray-400 font-normal">· puedes elegir varios</span></label>
                <div className="mt-1 max-h-64 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {servicios.length === 0 && (
                    <p className="text-sm text-gray-400 p-4 flex items-center gap-2"><Storefront size={16} weight="duotone" /> No hay servicios en esta sede.</p>
                  )}
                  {grupos.map(([cat, items]) => (
                    <div key={cat}>
                      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">{cat}</div>
                      <div className="divide-y divide-gray-100">
                        {items.map(s => {
                          const on = !!sel[s.idServicio]
                          return (
                            <div key={s.idServicio} className={`flex items-center gap-2.5 p-2.5 transition-colors ${on ? 'bg-emerald-50/40' : ''}`}>
                              <button
                                onClick={() => toggle(s.idServicio)}
                                aria-label={on ? 'Quitar' : 'Agregar'}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${on ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 hover:border-emerald-400'}`}
                              >
                                {on && <Check size={13} weight="bold" />}
                              </button>
                              <button onClick={() => toggle(s.idServicio)} className="flex-1 min-w-0 text-left">
                                <span className="block text-sm font-medium text-gray-900 truncate">{s.nombre}</span>
                                <span className="block text-xs text-gray-500">{soles(Number(s.precioBase) || 0)}</span>
                              </button>
                              {on && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => setQty(s.idServicio, (sel[s.idServicio] || 1) - 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition"><Minus size={13} weight="bold" /></button>
                                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{sel[s.idServicio]}</span>
                                  <button onClick={() => setQty(s.idServicio, (sel[s.idServicio] || 1) + 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition"><Plus size={13} weight="bold" /></button>
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

              {/* Cliente */}
              <div>
                <label className={label}>Cliente <span className="text-gray-400 font-normal">· opcional</span></label>
                <input className={field} value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Nombre del cliente" />
              </div>

              {/* Método de pago */}
              <div>
                <label className={label}>Método de pago</label>
                <div className="relative">
                  <select className={`${field} appearance-none pr-9`} value={metodo} onChange={e => setMetodo(e.target.value)}>
                    {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <CaretDown size={16} weight="bold" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {metodo !== 'Efectivo' && (
                <div>
                  <label className={label}>N° de operación <span className="text-gray-400 font-normal">· opcional</span></label>
                  <input className={field} value={operacion} onChange={e => setOperacion(e.target.value)} placeholder="Código de la transacción" />
                </div>
              )}

              {/* Evidencia */}
              <div>
                <label className={label}><Camera size={14} weight="duotone" /> Evidencia del pago {sinEvidencia ? <span className="text-gray-400 font-normal">· opcional</span> : <span className="text-rose-500 font-semibold">· obligatoria</span>}</label>
                {evidencia ? (
                  <div className="relative mt-1 inline-block">
                    <img src={evidencia} alt="evidencia" className="rounded-xl max-h-36 border border-gray-200" />
                    <button onClick={() => setEvidencia('')} aria-label="Quitar" className="absolute -top-2 -right-2 grid place-items-center w-6 h-6 rounded-full bg-white shadow border border-gray-200 text-gray-500 hover:text-rose-500">
                      <X size={12} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition">
                    <Camera size={22} weight="duotone" className="text-gray-400" />
                    <span className="text-sm text-gray-500">{subiendo ? 'Subiendo…' : 'Toca para adjuntar la foto del cobro'}</span>
                    <input type="file" accept="image/*" onChange={subir} className="hidden" />
                  </label>
                )}

                {/* Sin evidencia: trabajador = pendiente; admin = registrar sin evidencia */}
                {!evidencia && (
                  <label className="mt-2 flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={sinEvidencia} onChange={e => setSinEvidencia(e.target.checked)} className="mt-0.5 rounded border-gray-300" />
                    <span>
                      {(mode === 'admin' && ventaMia)
                        ? 'Registrar sin evidencia (queda registrada con fecha y hora).'
                        : 'Pendiente de evidencia: la subo después. La venta NO cuenta hasta adjuntar la foto.'}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Footer fijo */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{nItems > 0 ? `${nItems} ítem${nItems > 1 ? 's' : ''}` : 'Total'}</span>
                <span className="text-xl font-bold text-gray-900 tabular-nums">{soles(total)}</span>
              </div>
              <button
                onClick={confirmar}
                disabled={!puedeGuardar}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[.99] transition"
              >
                <Receipt size={18} weight="fill" />
                {saving ? 'Registrando…' : 'Registrar venta'}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                {(mode === 'admin' && ventaMia)
                  ? 'Se registra como venta aceptada.'
                  : 'Quedará pendiente de aprobación del administrador.'}
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
