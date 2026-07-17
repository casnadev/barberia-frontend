import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Plus, Minus, Camera, Scissors, Receipt, CaretRight, UserCircle, Storefront, Lightning, UserPlus, MagnifyingGlass } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { serviciosService } from '@/services/serviciosService'
import { trabajadoresService } from '@/services/trabajadoresService'
import { panelTrabajadorService } from '@/services/panelTrabajadorService'
import { ventasService } from '@/services/ventasService'
import { clientesService, type ClienteReal } from '@/services/clientesService'
import { fidelizacionService, type PreviewPuntos } from '@/services/fidelizacionService'
import { notificarFidelizacion } from '@/components/NotificacionFidelizacion'
import { InvitacionTarjetaModal } from '@/components/InvitacionTarjetaModal'
import type { ResultadoFidelizacion } from '@/services/ventasService'
import { mensajeError } from '@/utils/apiError'
import { ComboBox } from '@/components/ComboBox'
import { OptionGroup } from '@/components/ui/Controles'

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
/** T11 — Títulos de cada paso (solo se usan en móvil). */
const PASOS: Record<1 | 2 | 3, { titulo: string }> = {
  1: { titulo: 'Paso 1 de 3 · Servicios' },
  2: { titulo: 'Paso 2 de 3 · Cliente' },
  3: { titulo: 'Paso 3 de 3 · Pago' },
}

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
  // Cliente IDENTIFICADO (no texto libre): sin esto NO se acreditan puntos.
  // Se busca contra la tabla REAL de Clientes (endpoint /buscar), no contra el
  // listado agregado del CRM, cuyo idCliente no identifica a nadie.
  const [clienteSel, setClienteSel] = useState<ClienteReal | null>(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [resultados, setResultados] = useState<ClienteReal[]>([])
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  // Alta rápida: si el cliente no existe, se registra con nombre + teléfono.
  // El backend usa el TELÉFONO como llave: si no existe, crea el Cliente real.
  const [altaAbierta, setAltaAbierta] = useState(false)
  const [nomNuevo, setNomNuevo] = useState('')
  const [telNuevo, setTelNuevo] = useState('')
  // T6 — Tras cobrar, si la venta acreditó puntos, se le ofrece al cliente su
  // tarjeta con un QR. Es la puerta por la que va a entrar la mayoría: casi nadie
  // escanea el cartel del local, pero todo el mundo pasa por caja.
  const [invitacion, setInvitacion] = useState<ResultadoFidelizacion | null>(null)

  const [sinEvidencia, setSinEvidencia] = useState(false)
  const [saving, setSaving] = useState(false)
  // Tarea 4 — En modo Admin: ¿la venta la hizo el propio Admin ("Venta mía",
  // se acepta al instante) o un profesional (queda pendiente de su aprobación)?
  // Default true = venta propia del Admin (comportamiento habitual del dueño).
  const [ventaMia, setVentaMia] = useState(true)

  // ══ T11 · PASOS EN MÓVIL, PANEL ÚNICO EN DESKTOP ═══════════════════════════
  //
  // El escritorio YA tenía dos columnas y funcionaba: el cajero ve la venta entera
  // y cobra de un click. Meterle pasos ahí sería una regresión — son 2 taps más por
  // venta, y esto se usa 30 veces al día.
  //
  // El problema era el MÓVIL: una columna larguísima donde había que scrollear hasta
  // abajo para ver el total y el botón. Ahí sí van pasos.
  //
  // Mismo estado, misma lógica, mismos endpoints. Solo cambia QUÉ SE PINTA:
  //   móvil   → un paso a la vez  (`verPaso` filtra)
  //   desktop → todo, en 2 columnas (`verPaso` siempre true)
  //
  // matchMedia y no un simple `window.innerWidth`: hay que REACCIONAR al giro de
  // pantalla. Si el barbero rota el móvil a horizontal a mitad de venta y nos
  // quedamos en modo pasos, ve una columna estrecha en una pantalla ancha.
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia('(min-width: 640px)').matches,
  )
  const [paso, setPaso] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const onChange = () => setEsMovil(!mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  /** En desktop siempre TRUE: se pinta todo. En móvil, solo el paso actual. */
  const verPaso = (n: 1 | 2 | 3) => !esMovil || paso === n

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

  // Tarea 2 — El profesional se resuelve según QUIÉN hizo la venta:
  //  • "Venta mía (Admin)"      → el propio dueño-admin (ficha esDuenoAdmin).
  //    No se muestra dropdown: la venta es del Admin.
  //  • "Venta de un profesional" → se elige en el dropdown, que solo aparece
  //    cuando hay 2+ trabajadores (con 1, se autoselecciona).
  useEffect(() => {
    if (mode !== 'admin' || trabajadores.length === 0) return
    const admin = trabajadores.find((t: any) => t.esDuenoAdmin)
    if (ventaMia) {
      if (admin) setIdTrabajador(admin.idTrabajador)
    } else {
      setIdTrabajador(prev => {
        // Si venía seleccionado el Admin (o nada), pasa al primer profesional real.
        const eraAdminOVacio = prev == null || (admin && prev === admin.idTrabajador)
        if (!eraAdminOVacio) return prev
        const primerPro = trabajadores.find((t: any) => !t.esDuenoAdmin) ?? trabajadores[0]
        return primerPro?.idTrabajador ?? null
      })
    }
  }, [ventaMia, trabajadores, mode])

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

  // Aviso de puntos de fidelización: consulta el preview cuando cambia el total
  // (con un pequeño debounce). Si el programa está inactivo o falla, no se muestra
  // nada y la venta sigue su curso normal.
  const [preview, setPreview] = useState<PreviewPuntos | null>(null)
  useEffect(() => {
    if (total <= 0) { setPreview(null); return }
    let vivo = true
    const t = setTimeout(async () => {
      const p = await fidelizacionService.preview(total)
      if (vivo) setPreview(p && p.programaActivo && p.puntos > 0 ? p : null)
    }, 300)
    return () => { vivo = false; clearTimeout(t) }
  }, [total])

  // Búsqueda de clientes (debounce). El backend resuelve por IdCliente/teléfono.
  useEffect(() => {
    const q = buscaCliente.trim()
    if (clienteSel || q.length < 2) { setResultados([]); return }
    let vivo = true
    setBuscandoCliente(true)
    const t = setTimeout(async () => {
      try {
        const r = await clientesService.buscarReales(q, 8)
        if (vivo) setResultados(r)
      } catch { if (vivo) setResultados([]) }
      finally { if (vivo) setBuscandoCliente(false) }
    }, 300)
    return () => { vivo = false; clearTimeout(t) }
  }, [buscaCliente, clienteSel])
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
      const venta: any = await ventasService.registrarWalkIn({
        // Identificación del cliente. El backend resuelve por IdCliente o por TELÉFONO
        // (su llave natural: si el teléfono no existe, crea el cliente). Antes solo se
        // enviaba un nombre suelto → la venta quedaba anónima y NUNCA acumulaba puntos.
        idCliente: clienteSel?.idCliente || undefined,
        telefonoCliente: (clienteSel?.telefono || (telNuevo.trim().length === 9 ? telNuevo.trim() : '')) || undefined,
        nombreCliente: (clienteSel?.nombreCompleto || nomNuevo.trim()) || undefined,
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

      // Notificación de fidelización: el backend solo devuelve `fidelizacion` cuando
      // la venta ACREDITÓ puntos (quedó Registrada). En las pendientes viene null y
      // aquí no se muestra nada — los puntos entrarán al aprobarse.
      notificarFidelizacion(venta?.fidelizacion)

      // T6 — La invitación solo aparece si la venta acreditó puntos Y el cliente
      // todavía no tiene su tarjeta guardada. En una venta pendiente de aprobación
      // no hay `fidelizacion` (los puntos entran al aprobarla), así que tampoco hay
      // nada que ofrecer: se cierra como siempre.
      const fid: ResultadoFidelizacion | undefined = venta?.fidelizacion
      if (fid?.codigoQr && fid.puntosGanados > 0) {
        setInvitacion(fid)
        return   // el modal se cierra cuando el barbero cierre la invitación
      }

      onDone()
    } catch (e: any) { toast.error(mensajeError(e, 'No se pudo registrar la venta')) } finally { setSaving(false) }
  }

  // Solo hay puntos si la venta identifica al cliente (elegido o con celular válido).
  const clienteIdentificado = !!clienteSel || telNuevo.trim().length === 9

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 outline-none transition'
  const label = 'text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5'

  /** Abre el alta rápida arrastrando lo que el barbero ya venía escribiendo. */
  const abrirAlta = () => {
    setAltaAbierta(true)
    const q = buscaCliente.trim()
    if (q) {
      if (/^\d+$/.test(q)) setTelNuevo(q.slice(0, 9))   // eran dígitos → es su celular
      else setNomNuevo(q)                                // era texto → es su nombre
    }
    setBuscaCliente('')
  }

  const puedeGuardar = !saving && !subiendo && seleccionadas.length > 0 && (!!evidencia || sinEvidencia) && !!idTrabajador

  return (
    /* T13 — El modal deja de ser una ventanita de 448 px.
       Tenía demasiado dentro (atribución, profesional, catálogo entero, cliente,
       método de pago, evidencia y total) y en escritorio obligaba a hacer scroll
       dentro de un rectángulo estrecho, mientras media pantalla se quedaba vacía.

       No lo convertimos en página: es una acción rápida, no merece URL propia ni
       navegación. Lo que necesita es SITIO:
         • Móvil    → pantalla completa, sin bordes ni márgenes que roben espacio.
         • Desktop  → ancho, y el formulario en DOS columnas (ver más abajo). */
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Receipt size={20} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 leading-tight">Venta rápida</h3>
            <p className="text-xs text-gray-400 leading-tight">
              {esMovil ? PASOS[paso].titulo : 'Cobro sin reserva previa'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid place-items-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Barra de pasos. Solo en móvil: en desktop no hay pasos que marcar.
            Mismo patrón visual que el flujo de reserva pública. */}
        {esMovil && !loading && (
          <div className="flex gap-1.5 px-5 pb-3" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-[3px] flex-1 rounded-full transition-colors ${
                  i <= paso ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-emerald-500 mx-auto mb-3" />
            Cargando…
          </div>
        ) : (
          <>
            {/* Cuerpo scrolleable */}
            {/* T13 — DOS COLUMNAS en escritorio, UNA en móvil.
                Izquierda: qué se vendió (atribución, profesional, catálogo).
                Derecha:   a quién y cómo se cobra (cliente, pago, evidencia).
                Así el catálogo deja de ser una lista de 6 filas dentro de una
                ventanita, y el barbero ve la venta entera de un vistazo. */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {/* ── PASO 1 · Qué se vendió (y quién) ── */}
                <div className={`space-y-4 ${verPaso(1) ? '' : 'hidden'}`}>
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

                    {/* El dropdown de profesional SOLO aparece cuando la venta es
                        de un profesional Y hay 2+ trabajadores para elegir. En
                        "Venta mía (Admin)" el profesional es el propio Admin. */}
                    {!ventaMia && trabajadores.length >= 2 && (
                      <div>
                        <label className={label}><UserCircle size={14} weight="duotone" /> Profesional</label>
                        <ComboBox
                          value={idTrabajador ?? ''}
                          onChange={(v) => setIdTrabajador(v === '' ? null : Number(v))}
                          opciones={trabajadores.map(t => ({ valor: t.idTrabajador, etiqueta: t.nombreCompleto }))}
                          inputClassName={field}
                        />
                      </div>
                    )}
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

                </div>

                {/* ── PASOS 2 y 3 · A quién y cómo se cobra ──
                     En desktop es UNA columna con todo; en móvil son dos pasos. */}
                <div className="space-y-4">
                <div className={verPaso(2) ? '' : 'hidden'}>
                {/* Cliente — SELECTOR REAL (no texto libre).
                    Es lo que identifica al cliente y permite acreditar los puntos de
                    fidelización: el backend resuelve por IdCliente o por teléfono, nunca
                    por nombre suelto. Si no se elige a nadie, la venta es de "cliente a
                    pie" (anónima) y NO acumula puntos — y así se avisa abajo. */}
                <div>
                  <label className={label}>
                    <UserCircle size={14} weight="duotone" /> Cliente
                    <span className="text-gray-400 font-normal">· opcional</span>
                  </label>

                  {clienteSel ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{clienteSel.nombreCompleto || 'Cliente'}</p>
                        {clienteSel.telefono && <p className="text-xs text-gray-500">{clienteSel.telefono}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setClienteSel(null); setBuscaCliente('') }}
                        className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                        aria-label="Quitar cliente"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    /* T11 — El botón "Nuevo" está SIEMPRE a la vista.
                       Antes, la única forma de dar de alta a alguien era buscarlo…
                       y NO encontrarlo: la opción vivía dentro del desplegable y solo
                       aparecía cuando la búsqueda fallaba. Había que fracasar para poder
                       registrar. Ahora es un botón fijo al lado del buscador. */
                    <div className="flex gap-2">
                      <div className="relative min-w-0 flex-1">
                        <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className={`${field} pl-9`}
                          value={buscaCliente}
                          onChange={e => setBuscaCliente(e.target.value)}
                          placeholder="Buscar por nombre, teléfono o correo…"
                          autoComplete="off"
                        />
                        {buscaCliente.trim().length >= 2 && (
                          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                            {buscandoCliente ? (
                              <p className="px-3 py-2.5 text-xs text-gray-400">Buscando…</p>
                            ) : resultados.length === 0 ? (
                              <button
                                type="button"
                                onClick={abrirAlta}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                              >
                                <Plus size={13} weight="bold" /> No está: registrarlo ahora
                              </button>
                            ) : (
                              resultados.map(c => (
                                <button
                                  key={c.idCliente}
                                  type="button"
                                  onClick={() => { setClienteSel(c); setBuscaCliente('') }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-emerald-50"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-gray-900">
                                      {c.nombreCompleto || 'Sin nombre'}
                                      {/* T6 — El buscador de caja alcanza a TODA la marca, no solo a esta
                                          sede: el mismo cliente puede venir de otro local y sus puntos son
                                          de la marca. Se avisa de dónde viene, pero nunca se le esconde. */}
                                      {c.deOtraSede && (
                                        <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 align-middle">
                                          otra sede
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-500">{c.telefono || c.correo || 'sin contacto'}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {!altaAbierta && (
                        <button
                          type="button"
                          onClick={abrirAlta}
                          title="Registrar un cliente nuevo"
                          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <UserPlus size={16} weight="bold" />
                          <span className="hidden sm:inline">Nuevo</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Alta rápida: nombre + teléfono. Con esto el cliente queda registrado
                      de verdad y la venta ya le acredita puntos. */}
                  {!clienteSel && altaAbierta && (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-700">Registrar cliente nuevo</p>
                        <button type="button" onClick={() => { setAltaAbierta(false); setNomNuevo(''); setTelNuevo('') }} className="text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input className={field} value={nomNuevo} onChange={e => setNomNuevo(e.target.value)} placeholder="Nombre" />
                        <input className={field} value={telNuevo} onChange={e => setTelNuevo(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="Celular (9 dígitos)" inputMode="numeric" />
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-500">
                        {telNuevo.length === 9
                          ? '✓ Se registrará al cerrar la venta y sumará puntos.'
                          : 'El celular es obligatorio para identificarlo y darle puntos.'}
                      </p>
                    </div>
                  )}

                  {!clienteSel && !altaAbierta && (
                    <p className="mt-1 text-[11px] text-gray-400">
                      Sin cliente, la venta es <strong>a pie</strong> y no suma puntos de fidelización.
                    </p>
                  )}
                </div>

                </div>

                {/* ── PASO 3 · Pago ── */}
                <div className={`space-y-4 ${verPaso(3) ? '' : 'hidden'}`}>
                {/* Método de pago */}
                <div>
                  <label className={label}>Método de pago</label>
                  <OptionGroup
                    valor={metodo}
                    onChange={setMetodo}
                    cols={3}
                    variant="solid"
                    opciones={METODOS.map((mp) => ({ valor: mp, etiqueta: mp }))}
                  />
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
                </div>
              </div>
            </div>

            {/* Footer fijo */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{nItems > 0 ? `${nItems} ítem${nItems > 1 ? 's' : ''}` : 'Total'}</span>
                <span className="text-xl font-bold text-gray-900 tabular-nums">{soles(total)}</span>
              </div>

              {/* Aviso de fidelización: cuántos puntos suma esta venta */}
              {preview && clienteIdentificado && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <Lightning size={14} weight="fill" className="shrink-0 text-amber-500" />
                  <span>
                    Suma <strong>{preview.puntos} punto{preview.puntos === 1 ? '' : 's'}</strong> de fidelización
                    {preview.multiplicador > 1 && (
                      <> · <strong>x{preview.multiplicador}</strong>
                        {preview.promocionAplicada ? ` (${preview.promocionAplicada})` : ''}</>
                    )}
                  </span>
                </div>
              )}
              {/* En móvil, los pasos 1 y 2 avanzan; solo el 3 cobra.
                  En desktop no hay pasos: el botón cobra siempre.

                  Ojo con el paso 1: se exige al menos UN servicio antes de dejar
                  avanzar. Si no, el barbero llega al paso 3, pulsa Cobrar, y le sale
                  un error por algo que eligió (o no) dos pantallas atrás. El error hay
                  que darlo DONDE se comete. */}
              {esMovil && paso < 3 ? (
                <div className="flex gap-2">
                  {paso > 1 && (
                    <button
                      onClick={() => setPaso((p) => (p - 1) as 1 | 2 | 3)}
                      className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Atrás
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (paso === 1 && nItems === 0) {
                        toast.error('Elige al menos un servicio')
                        return
                      }
                      setPaso((p) => (p + 1) as 1 | 2 | 3)
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 active:scale-[.99]"
                  >
                    Continuar
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {esMovil && (
                    <button
                      onClick={() => setPaso(2)}
                      className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Atrás
                    </button>
                  )}
                  <button
                    onClick={confirmar}
                    disabled={!puedeGuardar}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[.99]"
                  >
                    <Receipt size={18} weight="fill" />
                    {saving ? 'Registrando…' : 'Registrar venta'}
                  </button>
                </div>
              )}
              <p className="text-[11px] text-gray-400 text-center">
                {(mode === 'admin' && ventaMia)
                  ? 'Se registra como venta aceptada.'
                  : 'Quedará pendiente de aprobación del administrador.'}
              </p>
            </div>
          </>
        )}
      </motion.div>

      {/* T6 — La invitación se pinta ENCIMA de la venta ya cobrada. Al cerrarla,
          se cierra también la venta. Así el barbero tiene la pantalla lista para
          enseñársela al cliente, que sigue delante del mostrador. */}
      {invitacion && (
        <InvitacionTarjetaModal
          fidelizacion={invitacion}
          onClose={() => { setInvitacion(null); onDone() }}
        />
      )}
    </div>
  )
}
