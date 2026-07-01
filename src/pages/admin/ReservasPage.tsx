import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reservasService, Reserva } from '@/services/reservasService'
import { SkeletonRows } from '@/components/Skeleton'
import { toast } from 'sonner'
import {
  Check, CheckCheck, X, Clock, User, Phone, Mail, Calendar, Scissors,
  Search, CalendarDays, DollarSign, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { mensajeError } from '@/utils/apiError'
import s from '@/styles/Reservas.module.css'
import d from '@/styles/Dashboard.module.css'

// Filtros por estado (pills de la toolbar)
const ESTADOS = [
  { key: 'todos', label: 'Todos', color: '#2855F6' },
  { key: 'pendiente', label: 'Pendiente', color: '#f59e0b' },
  { key: 'confirmada', label: 'Confirmada', color: '#2563eb' },
  { key: 'completada', label: 'Completada', color: '#16a34a' },
  { key: 'cancelada', label: 'Cancelada', color: '#ef4444' },
]

// Color sólido VIVO por estado (mismo criterio que la Agenda)
const colorEstado = (e?: string) => {
  switch ((e || '').toLowerCase()) {
    case 'pendiente': return '#f59e0b'
    case 'confirmada': return '#2563eb'
    case 'atendida':
    case 'completada': return '#16a34a'
    case 'cancelada': return '#ef4444'
    case 'noshow': return '#64748b'
    default: return '#64748b'
  }
}

// Hora 12h estilo Agenda: "2:00 pm" / "9:30 am"
const fmt12 = (hhmm?: string) => {
  if (!hhmm) return '--'
  const [hRaw, mRaw] = hhmm.split(':')
  const h = Number(hRaw), m = Number(mRaw || 0)
  if (Number.isNaN(h)) return '--'
  const p = h < 12 ? 'am' : 'pm'
  const hh = (h % 12) || 12
  return `${hh}:${String(m).padStart(2, '0')} ${p}`
}

const soles = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`

// Extrae los datos de una reserva tolerando ambas formas (Snap / Resumen)
const datos = (reserva: Reserva) => {
  const x: any = reserva
  return {
    id: reserva.idReserva || reserva.id || 0,
    nombre: x.nombreClienteSnap || x.nombreCliente || 'Sin nombre',
    telefono: x.telefonoClienteSnap || x.telefonoCliente || '',
    correo: x.correoClienteSnap || x.correoCliente || '',
    servicio: x.nombreServicio || x.servicios?.[0]?.nombre || '',
    trabajador: x.nombreTrabajador || x.nombreTrabajadorSnap || '',
    fecha: reserva.fechaReserva ? new Date(reserva.fechaReserva).toLocaleDateString('es-PE') : '-',
    horaIni: reserva.horaInicio || '',
    horaFin: reserva.horaFin || '',
    precio: x.precioServicioSnap ?? x.precioServicio,
    estadoRaw: reserva.estado || 'Desconocido',
    est: (reserva.estado || '').toLowerCase(),
    estadoPago: (reserva as any).estadoPago as string | undefined,
  }
}

// Estado del pago (venta enlazada) → etiqueta + estilo del pill. null = aún no se cobró.
const pagoMeta = (estadoPago?: string): { label: string; cls: string } | null => {
  switch (estadoPago) {
    case 'PendienteAprobacion': return { label: 'Pago pendiente', cls: 'bg-amber-100 text-amber-800' }
    case 'Registrada':          return { label: 'Pagado',         cls: 'bg-emerald-100 text-emerald-800' }
    case 'Rechazada':           return { label: 'Pago rechazado', cls: 'bg-rose-100 text-rose-800' }
    case 'Anulada':             return { label: 'Anulada',        cls: 'bg-gray-200 text-gray-700' }
    default:                    return null
  }
}

// ── Día y franja horaria (vista "solo del día") ──────────────────────
const isoDia = (d?: any): string => {
  if (!d) return ''
  // Si ya viene como 'YYYY-MM-DD...' (date-only o ISO), tomamos la parte de fecha
  // TAL CUAL, sin pasar por new Date(): new Date('2026-06-28') se parsea como
  // medianoche UTC y, en zonas UTC-negativas (Perú = UTC-5), getDate() local
  // devuelve el día anterior → la reserva de hoy se filtraba en "ayer".
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
  }
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
const horaNum = (h?: string): number => parseInt((h || '').slice(0, 2), 10) || 0
const franjaDe = (h?: string): 'manana' | 'tarde' | 'noche' => {
  const n = horaNum(h)
  return n < 12 ? 'manana' : n < 18 ? 'tarde' : 'noche'   // <12 mañana · 12-18 tarde · ≥18 noche
}
const FRANJAS = [
  { key: 'todo', label: 'Todo' },
  { key: 'manana', label: 'Mañana' },
  { key: 'tarde', label: 'Tarde' },
  { key: 'noche', label: 'Noche' },
]
const sumarDias = (iso: string, n: number) => {
  const dt = new Date(iso + 'T00:00:00'); dt.setDate(dt.getDate() + n); return isoDia(dt)
}
const fmtDiaLargo = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export function ReservasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [fecha, setFecha] = useState(isoDia(new Date()))   // por defecto: HOY
  const [franja, setFranja] = useState('todo')
  const [visible, setVisible] = useState(16)          // "Ver más"
  const [selected, setSelected] = useState<Reserva | null>(null)  // modal de detalle
  // Modal de cancelación con motivo (el motivo solo se incluye en el correo al cliente)
  const [cancelTarget, setCancelTarget] = useState<number | null>(null)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelando, setCancelando] = useState(false)

  // Carga de reservas cacheada con React Query (navegación instantánea al revisitar).
  const {
    data: reservas = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery<Reserva[]>({
    queryKey: ['reservas', 'admin'],
    queryFn: async () => {
      const data = await reservasService.getReservas()
      return Array.isArray(data) ? data : []
    },
  })
  const loadReservas = () => refetch()

  useEffect(() => { if (isError) toast.error('Error al cargar reservas') }, [isError])

  // Reset del "Ver más" cuando cambian datos/filtro/búsqueda.
  useEffect(() => { setVisible(16) }, [reservas, filterEstado, searchTerm, fecha, franja])

  const doConfirmar = async (id: number) => {
    try {
      await reservasService.confirmarReserva(id)
      toast.success('Reserva confirmada')
      setSelected(null)
      loadReservas()
    } catch (e) { toast.error(mensajeError(e, 'No se pudo confirmar la reserva')) }
  }

  const doCancelar = (id: number) => {
    setCancelMotivo('')
    setCancelTarget(id)
  }

  const confirmCancelar = async () => {
    if (cancelTarget == null) return
    try {
      setCancelando(true)
      await reservasService.cancelarReserva(cancelTarget, cancelMotivo.trim() || undefined)
      toast.success('Reserva cancelada')
      setCancelTarget(null)
      setSelected(null)
      loadReservas()
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo cancelar la reserva'))
    } finally {
      setCancelando(false)
    }
  }

  const doAtender = async (id: number) => {
    try {
      await reservasService.marcarAtendida(id)
      toast.success('Reserva marcada como atendida')
      setSelected(null)
      loadReservas()
    } catch (e) { toast.error(mensajeError(e, 'No se pudo marcar como atendida')) }
  }

  // Conteos (completada agrupa con atendida)
  // Reservas del día seleccionado (la vista es "solo del día").
  const delDia = reservas.filter((r) => isoDia((r as any).fechaReserva) === fecha)
  const count = (e: string) => delDia.filter((r) => {
    const est = (r.estado || '').toLowerCase()
    return e === 'completada' ? (est === 'completada' || est === 'atendida') : est === e
  }).length
  const countFranja = (f: string) =>
    f === 'todo' ? delDia.length : delDia.filter((r) => franjaDe((r as any).horaInicio) === f).length

  // Filtrado (día → franja → estado → búsqueda)
  const filtradas = delDia.filter((r) => {
    const est = (r.estado || '').toLowerCase()
    if (franja !== 'todo' && franjaDe((r as any).horaInicio) !== franja) return false
    if (filterEstado !== 'todos') {
      const match = filterEstado === 'completada' ? (est === 'completada' || est === 'atendida') : est === filterEstado
      if (!match) return false
    }
    if (searchTerm) {
      const x = datos(r)
      const q = searchTerm.toLowerCase()
      if (!x.nombre.toLowerCase().includes(q)
        && !x.telefono.includes(searchTerm)
        && !x.correo.toLowerCase().includes(q)
        && !x.trabajador.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Stat-cards de arriba (estilo Dashboard admin)
  const stats = [
    { label: 'Pendientes', value: count('pendiente'), icon: Clock, color: '#d97706', tint: 'rgba(245,158,11,.12)' },
    { label: 'Confirmadas', value: count('confirmada'), icon: Check, color: '#2563eb', tint: 'rgba(37,99,235,.12)' },
    { label: 'Completadas', value: count('completada'), icon: CheckCheck, color: '#16a34a', tint: 'rgba(22,163,74,.12)' },
    { label: 'Canceladas', value: count('cancelada'), icon: X, color: '#dc2626', tint: 'rgba(239,68,68,.12)' },
  ]

  return (
    <>
      {/* Stat-cards (estilo Dashboard) */}
      <div className={d.kpiGrid}>
        {stats.map((c, i) => (
          <motion.div
            key={c.label}
            className={d.kpiCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className={d.kpiTop}>
              <p className={d.kpiLabel}>{c.label}</p>
              <div className={d.kpiIcon} style={{ background: c.tint, color: c.color }}>
                <c.icon width={19} height={19} />
              </div>
            </div>
            <p className={d.kpiValue} style={{ color: c.color }}>{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Navegación de día + franjas — IDÉNTICO al modelo de Agenda */}
      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button onClick={() => setFecha(sumarDias(fecha, -1))} className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-[9px] text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition" aria-label="Día anterior"><ChevronLeft width={18} height={18} /></button>
          <button onClick={() => setFecha(isoDia(new Date()))} className="h-[34px] px-3.5 rounded-[9px] font-semibold text-sm text-gray-700 hover:bg-gray-100 transition">Hoy</button>
          <button onClick={() => setFecha(sumarDias(fecha, 1))} className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-[9px] text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition" aria-label="Día siguiente"><ChevronRight width={18} height={18} /></button>
        </div>
        <span className="inline-flex items-center gap-2 h-[42px] px-3.5 border border-gray-200 bg-white rounded-xl font-semibold text-sm text-gray-900 capitalize">
          <CalendarDays width={16} height={16} className="text-blue-600" /> {fmtDiaLargo(fecha)}
        </span>
      </div>

      {/* Franjas TODO / Mañana / Tarde / Noche — estilo Agenda */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FRANJAS.map((f) => {
          const active = franja === f.key
          return (
            <button key={f.key} onClick={() => setFranja(f.key)}
              className={`flex-1 min-w-[84px] inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl border text-sm font-semibold whitespace-nowrap transition ${active ? 'bg-blue-600 border-blue-600 text-white shadow-[0_6px_16px_rgba(37,99,235,.22)]' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700'}`}>
              {f.label}
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-extrabold ${active ? 'bg-white/25' : 'bg-black/[.08]'}`}>{countFranja(f.key)}</span>
            </button>
          )
        })}
      </div>

      {/* Buscador + filtros */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search className={s.searchIcon} width={18} height={18} />
          <input
            className={s.searchInput}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={s.filterBar}>
          {ESTADOS.map((est) => {
            const active = filterEstado === est.key
            return (
              <button
                key={est.key}
                className={`${s.fp} ${active ? s.fpActive : ''}`}
                style={active ? { background: est.color, borderColor: est.color } : { color: est.color }}
                onClick={() => setFilterEstado(est.key)}
              >
                {est.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className={s.tableCard} style={{ padding: 16 }}>
          <SkeletonRows rows={8} cols={4} />
        </div>
      ) : filtradas.length === 0 ? (
        <div className={s.tableCard}>
          <div className={s.empty}>
            <CalendarDays width={56} height={56} />
            <p>{delDia.length === 0 ? 'No hay reservas para este día.' : 'No hay reservas con ese filtro.'}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Grid: 2 en móvil, 3 en tablet, 4 en desktop. Tarjetas de color entero. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtradas.slice(0, visible).map((reserva) => {
              const x = datos(reserva)
              const color = colorEstado(reserva.estado)
              return (
                <motion.button
                  key={x.id}
                  type="button"
                  onClick={() => setSelected(reserva)}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.97 }}
                  className="text-left rounded-2xl p-3.5 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
                  style={{ background: color }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-extrabold leading-none">{fmt12(x.horaIni)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-white/25 rounded-full px-2 py-0.5 whitespace-nowrap">{x.estadoRaw}</span>
                  </div>
                  <p className="mt-2.5 font-semibold leading-tight truncate">{x.nombre}</p>
                  <p className="mt-0.5 text-xs text-white/85 flex items-center gap-1 truncate">
                    <Scissors width={11} height={11} className="shrink-0" /> {x.servicio || 'Servicio'}
                  </p>
                  {pagoMeta(x.estadoPago) && (
                    <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${pagoMeta(x.estadoPago)!.cls}`}>
                      <DollarSign width={10} height={10} /> {pagoMeta(x.estadoPago)!.label}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>

          {visible < filtradas.length && (
            <button
              onClick={() => setVisible((v) => v + 16)}
              className="mt-4 w-full py-3.5 rounded-2xl bg-white border border-gray-200 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition"
            >
              Ver más ({filtradas.length - visible})
            </button>
          )}
        </>
      )}

      {/* Modal de detalle */}
      <AnimatePresence>
        {selected && (() => {
          const x = datos(selected)
          const color = colorEstado(selected.estado)
          const horaTxt = x.horaFin ? `${fmt12(x.horaIni)} – ${fmt12(x.horaFin)}` : fmt12(x.horaIni)
          return (
            <motion.div
              className="fixed inset-0 z-[95] flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
              <motion.div
                role="dialog" aria-modal="true"
                className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
              >
                {/* Cabecera con color del estado */}
                <div className="p-5 text-white" style={{ background: color }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">{x.estadoRaw}</p>
                      <p className="text-lg font-extrabold mt-1 flex items-center gap-1.5"><Clock width={16} height={16} /> {horaTxt}</p>
                    </div>
                    <button onClick={() => setSelected(null)} aria-label="Cerrar" className="text-white/80 hover:text-white transition shrink-0">
                      <X width={20} height={20} />
                    </button>
                  </div>
                  <p className="mt-3 text-xl font-bold truncate">{x.nombre}</p>
                </div>

                {/* Detalle */}
                <div className="p-5 space-y-3 text-sm">
                  <Row icon={<Scissors width={15} height={15} />} label="Servicio" value={x.servicio || '—'} />
                  <Row icon={<User width={15} height={15} />} label="Barbero" value={x.trabajador || '—'} />
                  <Row icon={<Calendar width={15} height={15} />} label="Fecha" value={x.fecha} />
                  {x.telefono && <Row icon={<Phone width={15} height={15} />} label="Teléfono" value={x.telefono} />}
                  {x.correo && <Row icon={<Mail width={15} height={15} />} label="Correo" value={x.correo} />}
                  {x.precio != null && <Row icon={<DollarSign width={15} height={15} />} label="Precio" value={soles(x.precio)} />}
                </div>

                {/* Acciones */}
                <div className="px-5 pb-5 flex flex-wrap gap-2 justify-end">
                  {x.est === 'pendiente' && (
                    <button onClick={() => doConfirmar(x.id)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition active:scale-95">
                      <Check width={16} height={16} /> Confirmar
                    </button>
                  )}
                  {x.est === 'confirmada' && (
                    <button onClick={() => doAtender(x.id)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition active:scale-95">
                      <CheckCheck width={16} height={16} /> Atendida
                    </button>
                  )}
                  {(x.est === 'pendiente' || x.est === 'confirmada') && (
                    <button onClick={() => doCancelar(x.id)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition active:scale-95">
                      <X width={16} height={16} /> Cancelar
                    </button>
                  )}
                  <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition">
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* Modal: cancelar con motivo (el motivo solo se incluye en el correo al cliente) */}
      {cancelTarget != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !cancelando && setCancelTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><X className="w-5 h-5 text-rose-600" /> Cancelar reserva</h3>
            <p className="text-sm text-gray-500 mt-1">Esta acción no se puede deshacer. El cliente recibirá la notificación por su canal.</p>
            <label className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">Motivo (opcional)</label>
            <textarea
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">El motivo solo se incluye en el correo. Si el cliente eligió WhatsApp, recibirá el aviso sin el motivo.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setCancelTarget(null)} disabled={cancelando} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Volver</button>
              <button onClick={confirmCancelar} disabled={cancelando} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
                {cancelando ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* Fila de detalle del modal */
function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-gray-400 font-medium shrink-0">{icon} {label}</span>
      <span className="text-gray-900 font-semibold text-right truncate">{value}</span>
    </div>
  )
}
