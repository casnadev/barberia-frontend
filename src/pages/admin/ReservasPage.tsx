import { useState, useEffect } from 'react'
import { reservasService, Reserva } from '@/services/reservasService'
import { toast } from 'sonner'
import {
  Check, CheckCheck, X, Clock, User, Phone, Mail, Calendar, Scissors,
  Search, CalendarDays, DollarSign,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AdminLayout } from '@/components/AdminLayout'
import { confirmDialog } from '@/components/ConfirmDialog'
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

export function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [visible, setVisible] = useState(16)          // "Ver más"
  const [selected, setSelected] = useState<Reserva | null>(null)  // modal de detalle

  useEffect(() => { loadReservas() }, [])

  // Reset del "Ver más" cuando cambian datos/filtro/búsqueda.
  useEffect(() => { setVisible(16) }, [reservas, filterEstado, searchTerm])

  const loadReservas = async () => {
    try {
      setLoading(true)
      const data = await reservasService.getReservas()
      setReservas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando reservas:', error)
      toast.error('Error al cargar reservas')
      setReservas([])
    } finally {
      setLoading(false)
    }
  }

  const doConfirmar = async (id: number) => {
    try {
      await reservasService.confirmarReserva(id)
      toast.success('Reserva confirmada')
      setSelected(null)
      loadReservas()
    } catch (e) { toast.error(mensajeError(e, 'No se pudo confirmar la reserva')) }
  }

  const doCancelar = async (id: number) => {
    const ok = await confirmDialog({
      title: 'Cancelar reserva',
      message: '¿Seguro que deseas cancelar esta reserva? Esta acción no se puede deshacer.',
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await reservasService.cancelarReserva(id)
      toast.success('Reserva cancelada')
      setSelected(null)
      loadReservas()
    } catch (e) { toast.error(mensajeError(e, 'No se pudo cancelar la reserva')) }
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
  const count = (e: string) => reservas.filter((r) => {
    const est = (r.estado || '').toLowerCase()
    return e === 'completada' ? (est === 'completada' || est === 'atendida') : est === e
  }).length

  // Filtrado (estado + búsqueda)
  const filtradas = reservas.filter((r) => {
    const est = (r.estado || '').toLowerCase()
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
    <AdminLayout title="Reservas" subtitle="Gestiona las citas de tu barbería">
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
              <div>
                <p className={d.kpiLabel}>{c.label}</p>
                <p className={d.kpiValue} style={{ color: c.color }}>{c.value}</p>
              </div>
              <div className={d.kpiIcon} style={{ background: c.tint, color: c.color }}>
                <c.icon width={22} height={22} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Buscador + filtros */}
      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search className={s.searchIcon} width={18} height={18} />
          <input
            className={s.searchInput}
            type="text"
            placeholder="Buscar por cliente, teléfono, correo o barbero..."
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
        <div className={s.tableCard}>
          <div className={s.loading}>
            <div className={s.spinner} />
            <p className={s.loadingText}>Cargando reservas...</p>
          </div>
        </div>
      ) : filtradas.length === 0 ? (
        <div className={s.tableCard}>
          <div className={s.empty}>
            <CalendarDays width={56} height={56} />
            <p>{reservas.length === 0 ? 'Aún no hay reservas.' : 'No hay reservas con ese filtro.'}</p>
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
    </AdminLayout>
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
