import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { sedesService } from '@/services/sedesService'
import { reservasService, Reserva } from '@/services/reservasService'
import { trabajadoresService, Trabajador } from '@/services/trabajadoresService'
import { apiClient, buildImageUrl, getActiveTenant, urlSedeCanonica } from '@/services/apiClient'
import { sedeTenantService } from '@/services/sedeTenantService'
import { toast } from 'sonner'
import { CaretLeft as ChevronLeft, CaretRight as ChevronRight, X, Check, Checks as CheckCheck, Clock, User, Calendar, Scissors, CalendarX as CalendarOff, ArrowsOut as Maximize2 } from '@phosphor-icons/react'

import { motion, AnimatePresence } from 'framer-motion'
import { CalendarModal } from '@/pages/cliente/CalendarModal'
import { Fab } from '@/components/Fab'
import s from '@/styles/AgendaPage.module.css'
import { citaYaEmpezo, MSG_CITA_NO_LLEGA } from '@/utils/fecha'

/* PUT /api/Reservas/{id}/reprogramar  body { idTrabajador, fechaReserva, horaInicio } */
const RESCHEDULE = (id: number) => `/api/Reservas/${id}/reprogramar`

const PXM = 1.6          // píxeles por minuto
const SNAP = 15          // imán de 15 min
const PAD = 16           // padding vertical de la grilla (evita que se corte la 1ª hora)
const AV_COLORS = ['#2563eb', '#0d9488', '#ea580c', '#7c3aed', '#db2777', '#16a34a']

/* Turnos del día (contiguos). Solo agrupan; la vista se acota al horario de apertura. */
const TURNOS = [
  { key: 'todo',   label: 'Todo',   start: 0,       end: 24 * 60 },
  { key: 'manana', label: 'Mañana', start: 0,       end: 13 * 60 },
  { key: 'tarde',  label: 'Tarde',  start: 13 * 60, end: 19 * 60 },
  { key: 'noche',  label: 'Noche',  start: 19 * 60, end: 24 * 60 },
]

const toMin = (t?: string) => {
  if (!t) return null
  const [h, m] = t.split(':')
  return parseInt(h) * 60 + parseInt(m || '0')
}
const fromHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const fmt12 = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60, p = h < 12 ? 'am' : 'pm', hh = (h % 12) || 12
  return `${hh}:${String(m).padStart(2, '0')} ${p}`
}
// Etiqueta compacta para el gutter de horas (evita que "10:00 am" se corte y
// deja las horas perfectamente alineadas, estilo Fresha).
const fmtHourShort = (min: number) => {
  const h = Math.floor(min / 60), p = h < 12 ? 'am' : 'pm', hh = (h % 12) || 12
  return `${hh} ${p}`
}
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
/* Paleta pastel estilo Fresha: fondo suave + texto del mismo tono */
const themeEstado = (e?: string): { bg: string; fg: string } => {
  switch ((e || '').toLowerCase()) {
    case 'pendiente': return { bg: '#FDECC8', fg: '#92610A' }
    case 'confirmada': return { bg: '#D6E8F8', fg: '#0B4A77' }
    case 'atendida':
    case 'completada': return { bg: '#CBEDDF', fg: '#0B5C45' }
    case 'cancelada': return { bg: '#F7D8D8', fg: '#9B2C2C' }
    case 'noshow': return { bg: '#E4E7EC', fg: '#475569' }
    default: return { bg: '#E9EDF2', fg: '#475569' }
  }
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const soles = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`
const initials = (n?: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const firstName = (n?: string) => (n || '').trim().split(/\s+/)[0] || '—'

/** Barbero propio (modo trabajador): evita llamar endpoints admin-only. */
export interface TrabajadorPropio {
  idTrabajador: number
  nombreCompleto?: string
  urlFotoPerfil?: string
}

export interface AgendaBoardProps {
  /** 'admin' = todas las columnas + acciones; 'trabajador' = solo su columna, lectura + Atender. */
  mode?: 'admin' | 'trabajador'
  /** Requerido en modo trabajador: su propia ficha para pintar la única columna. */
  trabajadorPropio?: TrabajadorPropio
  /** Modo trabajador: se invoca al pulsar "Atender" para abrir el modal de evidencia del padre. */
  onAtenderTrabajador?: (reserva: Reserva) => void
}

export function AgendaBoard({ mode = 'admin', trabajadorPropio, onAtenderTrabajador }: AgendaBoardProps) {
  const esTrabajador = mode === 'trabajador'
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sede, setSede] = useState<any>(null)
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [turno, setTurno] = useState('todo')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [mobileBarber, setMobileBarber] = useState<number | null>(null)
  const [detail, setDetail] = useState<Reserva | null>(null)
  const [busy, setBusy] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // Tarea 3: cancelación con advertencia + motivo (el motivo solo lo ven Admin y
  // el trabajador dueño de la cita; al cliente no se le muestra).
  const [cancelTarget, setCancelTarget] = useState<Reserva | null>(null)
  const [cancelMotivo, setCancelMotivo] = useState('')

  const areaRef = useRef<HTMLDivElement>(null)
  const dragLblRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<any>(null)

  useEffect(() => {
    const onR = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  const fechaStr = iso(currentDate)

  // ── Datos cacheados con React Query ───────────────────────────────────────
  // Base (sede + trabajadores + servicios): NO depende de la fecha, así que no
  // se recarga al cambiar de día. Reservas: cacheadas por día. Revisitar la
  // Agenda (o un día ya visto) sale al instante, sin recargar una y otra vez.
  // Volcamos a los estados existentes para no tocar el markup ni el drag-drop.
  const baseQuery = useQuery({
    queryKey: ['agenda', 'base', esTrabajador, trabajadorPropio?.idTrabajador ?? 0],
    queryFn: async () => {
      const sedeData = await sedesService.getSedeActual().catch(() => null)
      if (esTrabajador) {
        return {
          sede: sedeData,
          trabajadores: (trabajadorPropio ? [trabajadorPropio as unknown as Trabajador] : []),
          servicios: [] as any[],
        }
      }
      const [trabsData, servData] = await Promise.all([
        trabajadoresService.getTrabajadores().catch(() => []),
        apiClient.get('/api/Servicios/admin/todos').then((r) => r.data.data || r.data).catch(() => []),
      ])
      return {
        sede: sedeData,
        trabajadores: Array.isArray(trabsData) ? trabsData : [],
        servicios: Array.isArray(servData) ? servData : [],
      }
    },
  })

  const reservasQuery = useQuery({
    queryKey: ['agenda', 'reservas', fechaStr],
    queryFn: async () => {
      const data = await reservasService.getReservas(fechaStr, fechaStr)
      return Array.isArray(data) ? data : []
    },
  })

  const loading = baseQuery.isLoading || reservasQuery.isLoading
  const loadData = () => { baseQuery.refetch(); reservasQuery.refetch() }

  // Volcado de datos cacheados → estados que usa el markup (sin cambiar el render).
  useEffect(() => {
    if (!baseQuery.data) return
    setSede(baseQuery.data.sede)
    setTrabajadores(baseQuery.data.trabajadores)
    setServicios(baseQuery.data.servicios)
    if (mobileBarber == null && baseQuery.data.trabajadores.length)
      setMobileBarber(baseQuery.data.trabajadores[0].idTrabajador!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseQuery.data])

  useEffect(() => {
    if (reservasQuery.data) setReservas(reservasQuery.data)
  }, [reservasQuery.data])

  useEffect(() => {
    if (baseQuery.isError || reservasQuery.isError) toast.error('Error cargando agenda')
  }, [baseQuery.isError, reservasQuery.isError])

  // ===== Horario de la sede =====
  let openMin = toMin(sede?.horarioApertura) ?? 8 * 60
  let closeMin = toMin(sede?.horarioCierre) ?? 21 * 60
  if (closeMin <= openMin) { openMin = 8 * 60; closeMin = 21 * 60 }

  // ===== Rango visible según turno (acotado al horario) =====
  const turnoObj = TURNOS.find((t) => t.key === turno) || TURNOS[0]
  const viewStart = Math.max(openMin, turnoObj.start)
  const viewEnd = Math.min(closeMin, turnoObj.end)
  const hasView = viewEnd > viewStart
  const gridH = (hasView ? (viewEnd - viewStart) * PXM : 0) + PAD * 2
  const yOf = (min: number) => (min - viewStart) * PXM + PAD

  // ===== Modos de vista =====
  const activos = trabajadores.filter((t) => t.idTrabajador != null)
  const listMode = isMobile && !expanded            // móvil normal => lista compacta
  const canDrag = !esTrabajador && (!isMobile || expanded) // trabajador: solo lectura (sin drag)
  const gridColumns = activos                       // la grilla siempre muestra todos
  const n = Math.max(gridColumns.length, 1)
  const visibleIds = new Set<number | undefined>(listMode ? [mobileBarber ?? undefined] : gridColumns.map((c) => c.idTrabajador))

  const durOf = (r: Reserva) => {
    const st = toMin(r.horaInicio) ?? openMin
    const fn = toMin(r.horaFin)
    return fn && fn > st ? fn - st : 30
  }
  const svcName = (id?: number) => servicios.find((sv) => sv.idServicio === id)?.nombre as string | undefined

  // ===== Multi-servicio: cantidad + total para las cards =====
  const nServicios = (r: Reserva) => (r.servicios?.length ?? (r.idServicio ? 1 : 0))
  const totalReserva = (r: Reserva) => r.precioServicio
  const metaTxt = (r: Reserva) => {
    const c = nServicios(r)
    const t = totalReserva(r)
    const parts: string[] = []
    if (c > 0) parts.push(`${c} serv.`)
    if (t != null && t > 0) parts.push(soles(t))
    return parts.join(' · ')
  }

  // ===== Solape de horario =====
  const overlapsRange = (r: Reserva, ts: number, te: number) => {
    const st = toMin(r.horaInicio) ?? 0
    const fn = toMin(r.horaFin) ?? st + 30
    return st < te && fn > ts
  }
  const turnoRange = (t: typeof TURNOS[number]) => ({ s: Math.max(openMin, t.start), e: Math.min(closeMin, t.end) })
  const turnoCount = (t: typeof TURNOS[number]) => { const { s: a, e: b } = turnoRange(t); return b > a ? reservas.filter((r) => visibleIds.has(r.idTrabajador) && overlapsRange(r, a, b)).length : 0 }
  const turnoEnabled = (t: typeof TURNOS[number]) => { const { s: a, e: b } = turnoRange(t); return b > a }

  // ===== Línea de "ahora" =====
  const esHoy = iso(new Date()) === fechaStr
  const nowM = new Date().getHours() * 60 + new Date().getMinutes()
  const showNow = esHoy && nowM >= viewStart && nowM <= viewEnd

  // ===== Marcas de la grilla =====
  const marks: number[] = []
  if (hasView) for (let m = Math.ceil(viewStart / 30) * 30; m <= viewEnd; m += 30) marks.push(m)

  // ===== Helpers grilla =====
  const snap = (x: number) => Math.round(x / SNAP) * SNAP
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
  const pointerMin = (clientY: number) => {
    const r = areaRef.current!.getBoundingClientRect()
    return viewStart + (clientY - r.top - PAD) / PXM
  }
  const showDragLbl = (start: number, dur: number, col: number) => {
    const el = dragLblRef.current!
    el.style.display = 'block'
    el.textContent = `${fmt12(start)} – ${fmt12(start + dur)}`
    el.style.top = `${yOf(start) - 24}px`
    el.style.left = `calc(${col} * (100% / ${n}) + 8px)`
  }

  // ===== Drag (desktop o expandido) =====
  const onBlockPointerDown = (e: React.PointerEvent, r: Reserva) => {
    if (!canDrag) return
    const est = (r.estado || '').toLowerCase()
    if (est === 'cancelada' || est === 'atendida') return
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    const isHandle = (e.target as HTMLElement).classList.contains(s.resize)
    const start = toMin(r.horaInicio) ?? viewStart
    const dur = durOf(r)
    dragRef.current = {
      r, el, mode: isHandle ? 'resize' : 'move',
      grab: pointerMin(e.clientY) - start,
      startX: e.clientX, startY: e.clientY, moved: false,
      start, dur, col: gridColumns.findIndex((c) => c.idTrabajador === r.idTrabajador),
    }
    if (dragRef.current.col < 0) dragRef.current.col = 0
    el.classList.add(s.dragging)
    document.addEventListener('pointermove', onDragMove)
    document.addEventListener('pointerup', onDragUp)
  }
  const onDragMove = (e: PointerEvent) => {
    const d = dragRef.current; if (!d) return
    if (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4) d.moved = true
    const r = areaRef.current!.getBoundingClientRect()
    if (d.mode === 'move') {
      let ns = snap(pointerMin(e.clientY) - d.grab)
      ns = clamp(ns, viewStart, viewEnd - d.dur)
      const col = clamp(Math.floor((e.clientX - r.left) / (r.width / n)), 0, n - 1)
      d.start = ns; d.col = col
      d.el.style.top = `${yOf(ns)}px`
      d.el.style.left = `calc(${col} * (100% / ${n}) + 3px)`
    } else {
      let ne = snap(pointerMin(e.clientY))
      ne = clamp(ne, d.start + SNAP, viewEnd)
      d.dur = ne - d.start
      d.el.style.height = `${d.dur * PXM - 2}px`
    }
    showDragLbl(d.start, d.dur, d.col)
  }
  const onDragUp = () => {
    const d = dragRef.current; if (!d) return
    d.el.classList.remove(s.dragging)
    if (dragLblRef.current) dragLblRef.current.style.display = 'none'
    document.removeEventListener('pointermove', onDragMove)
    document.removeEventListener('pointerup', onDragUp)
    if (!d.moved) { setDetail(d.r); dragRef.current = null; return }
    const trab = gridColumns[d.col]
    const horaInicio = `${fromHHMM(d.start)}:00`
    const horaFin = `${fromHHMM(d.start + d.dur)}:00`
    const rid = d.r.idReserva || d.r.id
    setReservas((prev) => prev.map((x) => ((x.idReserva || x.id) === rid
      ? { ...x, horaInicio, horaFin, idTrabajador: trab?.idTrabajador, nombreTrabajador: trab?.nombreCompleto } : x)))
    persistMove(rid!, { idTrabajador: trab?.idTrabajador, fechaReserva: fechaStr, horaInicio })
    dragRef.current = null
  }
  const persistMove = async (id: number, payload: any) => {
    try {
      await apiClient.put(RESCHEDULE(id), payload)
      toast.success('Reserva reprogramada')
      // Éxito: el estado local ya refleja el cambio (update optimista en onDragUp).
      // NO recargamos toda la agenda: evitamos el parpadeo/spinner innecesario.
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'No se pudo reprogramar')
      loadData() // Error: recargamos para REVERTIR la posición optimista.
    }
  }

  // ===== Acciones =====
  const accion = async (fn: () => Promise<any>, ok: string) => {
    try { setBusy(true); await fn(); toast.success(ok); setDetail(null); loadData() }
    catch { toast.error('No se pudo completar la acción') } finally { setBusy(false) }
  }

  // ===== Navegación de fecha =====
  const shiftDay = (delta: number) => { const d = new Date(currentDate); d.setDate(d.getDate() + delta); setCurrentDate(d) }
  const onPickDate = (dStr: string) => {
    const [y, m, dd] = dStr.split('-').map(Number)
    if (y && m && dd) setCurrentDate(new Date(y, m - 1, dd))
  }
  const labelFecha = currentDate.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const goReservar = async () => {
    // "Añadir cita" abre la reserva pública de la SEDE ACTIVA en su URL canónica
    // (negocio.barber.pe o /{distrito}), nunca el subdominio de sede.
    const sub = getActiveTenant()
    if (sub && window.location.hostname.endsWith('barber.pe')) {
      try {
        const mis = await sedeTenantService.getMisSedes()
        const activa = mis.find((x) => x.subdominio === sub) ?? mis[0]
        const multi = mis.filter((x) => x.esPublica).length >= 2
        if (activa?.slugMarca) {
          window.open(
            urlSedeCanonica({ slugMarca: activa.slugMarca, slugSede: activa.slug, subdominio: activa.subdominio, esMultisede: multi }),
            '_blank', 'noopener',
          )
          return
        }
      } catch { /* cae al navigate en la misma pestaña */ }
    }
    // Fallback: landing de reserva de LA sede activa (no la ruta huérfana sin sede).
    if (sede?.idSede) { navigate(`/reservar/${sede.idSede}`); return }
    navigate('/')
  }

  // ===== Bloques de una columna (grilla) =====
  const blocksOf = (t: Trabajador, colIdx: number) =>
    reservas
      .filter((r) => r.idTrabajador === t.idTrabajador && overlapsRange(r, viewStart, viewEnd))
      .map((r) => {
        const start = clamp(toMin(r.horaInicio) ?? viewStart, viewStart, viewEnd)
        const dur = Math.min(durOf(r), viewEnd - start)
        const th = themeEstado(r.estado)
        const end = start + dur
        const h = Math.max(dur * PXM - 2, 34)
        const cliente = r.nombreClienteSnap || r.nombreCliente || 'Cliente'
        const svc = svcName(r.idServicio)
        const est = (r.estado || '').toLowerCase()
        const cancel = est === 'cancelada'
        const locked = est === 'cancelada' || est === 'atendida'
        return (
          <div
            key={r.idReserva || r.id}
            className={`${s.block} ${canDrag ? s.blockDraggable : ''}`}
            style={{
              top: `${yOf(start)}px`,
              height: `${h}px`,
              left: `calc(${colIdx} * (100% / ${n}) + 3px)`,
              width: `calc(100% / ${n} - 6px)`,
              background: th.bg,
              border: `1px solid ${th.fg}22`,
              textDecoration: cancel ? 'line-through' : 'none',
            }}
            onPointerDown={(e) => onBlockPointerDown(e, r)}
            onClick={(e) => { e.stopPropagation(); if (!canDrag || locked) setDetail(r) }}
          >
            <div className={s.bTime} style={{ color: th.fg }}>{fmt12(start)}{h > 40 ? ` – ${fmt12(end)}` : ''}</div>
            <div className={s.bName}>{cliente}</div>
            {h > 54 && (metaTxt(r) || svc) && <div className={s.bSvc}>{metaTxt(r) || svc}</div>}
            {canDrag && !cancel && <div className={s.resize} />}
          </div>
        )
      })

  // ===== Citas para la lista móvil =====
  const mobileReservas = reservas
    .filter((r) => r.idTrabajador === mobileBarber && overlapsRange(r, viewStart, viewEnd))
    .sort((a, b) => (toMin(a.horaInicio) ?? 0) - (toMin(b.horaInicio) ?? 0))

  // ===== Sub-render: navegación de fecha (reutilizable) =====
  const dateNavEl = (
    <div className={s.dateNav}>
      <button className={s.navBtn} onClick={() => shiftDay(-1)} aria-label="Día anterior"><ChevronLeft width={18} height={18} /></button>
      <button className={s.todayBtn} onClick={() => setCurrentDate(new Date())}>Hoy</button>
      <button className={s.navBtn} onClick={() => shiftDay(1)} aria-label="Día siguiente"><ChevronRight width={18} height={18} /></button>
    </div>
  )

  // ===== Sub-render: barra de turnos (reutilizable) =====
  const turnBarEl = (
    <div className={s.turnBar}>
      {TURNOS.map((t) => (
        <button
          key={t.key}
          className={`${s.turnBtn} ${turno === t.key ? s.turnBtnActive : ''}`}
          disabled={!turnoEnabled(t)}
          onClick={() => setTurno(t.key)}
        >
          {t.label}
          <span className={s.turnCount}>{turnoCount(t)}</span>
        </button>
      ))}
    </div>
  )

  // ===== Sub-render: grilla por columnas (inline o pantalla completa) =====
  const renderGrid = (fs: boolean) => (
    <div className={`${s.calWrap} ${fs ? s.calWrapFs : ''}`}>
      <div className={s.gridScroll}>
        <div className={s.gridInner} style={fs ? { minWidth: 60 + n * 150 } : undefined}>
          <div className={s.heads}>
            <div className={s.headSpacer} />
            {gridColumns.map((t, i) => (
              <div key={t.idTrabajador} className={s.headCol}>
                <span className={s.hAv} style={{ background: AV_COLORS[i % AV_COLORS.length] }}>
                  {t.urlFotoPerfil ? <img src={buildImageUrl(t.urlFotoPerfil)} alt={t.nombreCompleto} /> : initials(t.nombreCompleto)}
                </span>
                <span className={s.hName}>{firstName(t.nombreCompleto)}</span>
              </div>
            ))}
          </div>
          <div className={s.bodyScroll}>
            <div className={s.gutter} style={{ height: gridH }}>
              {marks.filter((m) => m % 60 === 0).map((m) => (
                <div key={m} className={s.gLabel} style={{ top: `${yOf(m)}px` }}>{fmtHourShort(m)}</div>
              ))}
            </div>
            <div ref={areaRef} className={`${s.area} ${canDrag ? s.areaDrag : ''}`} style={{ height: gridH }}>
              {marks.map((m) => (
                <div key={m} className={m % 60 ? s.halfLine : s.hourLine} style={{ top: `${yOf(m)}px` }} />
              ))}
              {gridColumns.map((_, i) => i > 0 && <div key={i} className={s.colDiv} style={{ left: `calc(${i} * (100% / ${n}))` }} />)}
              {showNow && <div className={s.nowLine} style={{ top: `${yOf(nowM)}px` }}><span className={s.nowDot} /></div>}
              {gridColumns.map((t, i) => blocksOf(t, i))}
              <div ref={dragLblRef} className={s.dragLbl} style={{ display: 'none' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Toolbar */}
      <div className={s.toolbar}>
        {dateNavEl}
        <button className={s.calBtn} onClick={() => setCalOpen(true)}>
          <Calendar width={18} height={18} />
          <span className={s.dateLabel}>{labelFecha}</span>
        </button>
        <button className={s.expandBtn} onClick={() => setExpanded(true)} title="Expandir agenda" aria-label="Expandir agenda">
          <Maximize2 width={18} height={18} />
        </button>
        <span className={s.spring} />
        {!isMobile && !esTrabajador && <button className={s.addBtn} onClick={goReservar}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Añadir cita</button>}
      </div>

      {/* Barra de turnos */}
      {turnBarEl}

      {/* Chips de barbero (mobile) — solo admin (varias columnas) */}
      {!esTrabajador && isMobile && activos.length > 0 && (
        <div className={s.mobileBar}>
          {activos.map((t, i) => (
            <button key={t.idTrabajador} className={`${s.mChip} ${mobileBarber === t.idTrabajador ? s.mChipActive : ''}`} onClick={() => setMobileBarber(t.idTrabajador!)}>
              <span className={s.mAv} style={{ background: AV_COLORS[i % AV_COLORS.length] }}>
                {t.urlFotoPerfil ? <img src={buildImageUrl(t.urlFotoPerfil)} alt={t.nombreCompleto} /> : initials(t.nombreCompleto)}
              </span>
              {firstName(t.nombreCompleto)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={s.calWrap}><div className={s.loading}><div className={s.spinner} /><p className={s.muted}>Cargando agenda...</p></div></div>
      ) : activos.length === 0 ? (
        <div className={s.calWrap}><div className={s.noCols}>No hay barberos para mostrar.</div></div>
      ) : expanded ? null : listMode ? (
        /* ---------- Vista móvil: lista compacta por turno ---------- */
        <div className={s.calWrap}>
          {mobileReservas.length === 0 ? (
            <div className={s.mEmpty}>
              <span className={s.mEmptyIcon}><CalendarOff width={22} height={22} /></span>
              No hay citas en este turno.
            </div>
          ) : (
            <div className={s.mobileList}>
              {mobileReservas.map((r) => {
                const start = toMin(r.horaInicio) ?? viewStart
                const end = r.horaFin ? toMin(r.horaFin)! : null
                const th = themeEstado(r.estado)
                const cliente = r.nombreClienteSnap || r.nombreCliente || 'Cliente'
                const svc = svcName(r.idServicio)
                return (
                  <div key={r.idReserva || r.id} className={s.mCard} style={{ background: th.bg, borderColor: `${th.fg}22` }} onClick={() => setDetail(r)}>
                    <div className={s.mCardTop}>
                      <span className={s.mCardTimeRow} style={{ color: th.fg }}>{fmt12(start)}{end ? ` – ${fmt12(end)}` : ''}</span>
                      <span className={s.mState} style={{ color: th.fg }}>{r.estado || ''}</span>
                    </div>
                    <div className={s.mCardName}>{cliente}</div>
                    {(metaTxt(r) || svc) && <div className={s.mCardSvc}>{metaTxt(r) || svc}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* ---------- Vista desktop: grilla inline ---------- */
        renderGrid(false)
      )}

      {/* FAB mobile — en modo trabajador lo provee la página contenedora */}
      {!esTrabajador && <Fab onClick={goReservar} label="Añadir cita" />}

      {/* Modo pantalla completa (drag-and-drop también en móvil) */}
      {expanded && (
        <div className={s.fsOverlay}>
          <div className={s.fsBar}>
            {dateNavEl}
            <span className={s.fsTitle}>{labelFecha}</span>
            <span className={s.spring} />
            <button className={s.fsClose} onClick={() => setExpanded(false)} aria-label="Cerrar">
              <X width={20} height={20} />
            </button>
          </div>
          <div className={s.fsTurns}>{turnBarEl}</div>
          <p className={s.fsHint}>{esTrabajador ? 'Toca una cita para ver el detalle.' : 'Arrastra una cita para moverla o reprogramarla.'}</p>
          <div className={s.fsGrid}>
            {activos.length === 0 ? <div className={s.noCols}>No hay barberos para mostrar.</div> : renderGrid(true)}
          </div>
        </div>
      )}

      {/* Calendario (Admin: permite fechas pasadas) */}
      <CalendarModal isOpen={calOpen} selectedDate={fechaStr} onSelectDate={onPickDate} onClose={() => setCalOpen(false)} allowPast />

      {/* Modal detalle */}
      <AnimatePresence>
        {detail && (
          <motion.div className={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)}>
            <motion.div className={s.modal} initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .95, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className={s.modalHead}>
                <h2 className={s.modalTitle}>{detail.nombreClienteSnap || detail.nombreCliente || 'Cliente'}</h2>
                <button className={s.modalClose} onClick={() => setDetail(null)} aria-label="Cerrar"><X width={18} height={18} /></button>
              </div>
              <div className={s.form}>
                <span className={s.detailBadge} style={{ background: colorEstado(detail.estado) }}>{detail.estado || 'Desconocido'}</span>
                <div className={s.dRow}><Clock width={16} height={16} /> {fmt12(toMin(detail.horaInicio) ?? openMin)}{detail.horaFin ? ` – ${fmt12(toMin(detail.horaFin)!)}` : ''}</div>
                {(detail.servicios?.length || svcName(detail.idServicio)) && (
                  <div className={s.dRow}>
                    <Scissors width={16} height={16} />{' '}
                    {detail.servicios?.length ? detail.servicios.map((x) => x.nombre).join(', ') : svcName(detail.idServicio)}
                    {totalReserva(detail) != null && totalReserva(detail)! > 0 ? ` · ${soles(totalReserva(detail))}` : ''}
                  </div>
                )}
                <div className={s.dRow}><User width={16} height={16} /> {detail.nombreTrabajador || detail.nombreTrabajadorSnap || 'Sin barbero'}</div>
                <div className={s.dRow}><Calendar width={16} height={16} /> {labelFecha}</div>
                {/* Tarea 3: motivo de cancelación — visible para Admin y trabajador dueño. */}
                {(detail.estado || '').toLowerCase() === 'cancelada' && detail.motivoCancelacion && (
                  <div className={s.dRow} style={{ alignItems: 'flex-start', color: '#b91c1c', background: '#fef2f2', borderRadius: 10, padding: '8px 10px' }}>
                    <X width={16} height={16} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span><strong>Motivo:</strong> {detail.motivoCancelacion}</span>
                  </div>
                )}
              </div>
              <div className={s.detailActions}>
                {esTrabajador ? (
                  ['atendida', 'completada', 'cancelada', 'noshow'].includes((detail.estado || '').toLowerCase()) ? (
                    <p className={s.muted} style={{ textAlign: 'center', margin: 0 }}>Sin acciones disponibles para este estado.</p>
                  ) : (
                    <button
                      className={s.actFull}
                      style={{ background: '#16a34a' }}
                      disabled={busy}
                      onClick={() => {
                        const r = detail
                        if (!citaYaEmpezo(r.fechaReserva, r.horaInicio)) { toast.error(MSG_CITA_NO_LLEGA); return }
                        setDetail(null); onAtenderTrabajador?.(r)
                      }}
                    >
                      <CheckCheck width={16} height={16} /> Atender y adjuntar evidencia
                    </button>
                  )
                ) : (
                  <>
                    {(detail.estado || '').toLowerCase() === 'pendiente' && (
                      <button className={s.actFull} style={{ background: '#2563eb' }} disabled={busy} onClick={() => accion(() => reservasService.confirmarReserva((detail.idReserva || detail.id)!), 'Reserva confirmada')}><Check width={16} height={16} /> Confirmar</button>
                    )}
                    {(detail.estado || '').toLowerCase() === 'confirmada' && (
                      <button className={s.actFull} style={{ background: '#16a34a' }} disabled={busy} onClick={() => { if (!citaYaEmpezo(detail.fechaReserva, detail.horaInicio)) { toast.error(MSG_CITA_NO_LLEGA); return } accion(() => reservasService.marcarAtendida((detail.idReserva || detail.id)!), 'Marcada como atendida') }}><CheckCheck width={16} height={16} /> Marcar atendida</button>
                    )}
                    {((detail.estado || '').toLowerCase() === 'pendiente' || (detail.estado || '').toLowerCase() === 'confirmada') && (
                      <button className={s.actFull} style={{ background: '#ef4444' }} disabled={busy} onClick={() => { setCancelMotivo(''); setCancelTarget(detail) }}><X width={16} height={16} /> Cancelar</button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tarea 3: modal de cancelación con advertencia + motivo (Admin). */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !busy && setCancelTarget(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <motion.div
              initial={{ scale: .97, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 20, boxShadow: '0 10px 40px rgba(0,0,0,.2)' }}
            >
              <h3 style={{ margin: 0, fontWeight: 700, color: '#111827' }}>Cancelar cita</h3>
              <div style={{ marginTop: 10, fontSize: 13, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 10px' }}>
                Al cancelar, <strong>el cliente también verá que su cita fue cancelada</strong>. El motivo que escribas es interno: solo lo verán tú y el trabajador de la cita.
              </div>
              <label style={{ display: 'block', marginTop: 12, fontSize: 12, color: '#6b7280' }}>Motivo (opcional)</label>
              <textarea
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                rows={3}
                placeholder="Ej.: el cliente pidió reprogramar, no confirmó, etc."
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 10px', fontSize: 14, outline: 'none', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  disabled={busy}
                  onClick={() => setCancelTarget(null)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Volver
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    const r = cancelTarget
                    const motivo = cancelMotivo.trim() || undefined
                    setCancelTarget(null)
                    accion(() => reservasService.cancelarReserva((r.idReserva || r.id)!, motivo), 'Reserva cancelada')
                  }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Sí, cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
