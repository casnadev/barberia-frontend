import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Check, X, CurrencyDollar, CalendarDots, Scissors, User, Image as ImageIcon,
  Checks, Prohibit, Storefront, CalendarCheck, QrCode,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { notificarFidelizacion } from '@/components/NotificacionFidelizacion'
import { CalendarModal } from '@/pages/cliente/CalendarModal'
import { buildImageUrl } from '@/services/apiClient'
import { ventasService, type VentaResumen } from '@/services/ventasService'
import { CobrarVentaModal } from '@/components/CobrarVentaModal'
import { EscanearMonederoModal } from '@/components/EscanearMonederoModal'
import { Fab } from '@/components/Fab'
import { SkeletonRows } from '@/components/Skeleton'
import { FiltroTrabajador } from '@/components/FiltroTrabajador'
import { trabajadoresService } from '@/services/trabajadoresService'
import { mensajeError } from '@/utils/apiError'
import { montoFmt } from '@/utils/kpiMonto'
import { fechaHoraPeru } from '@/utils/fecha'

const soles = (n?: number) => `S/ ${(Number(n) || 0).toFixed(2)}`
const isoLocal = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
const fmtCorta = (iso: string) => {
  try { return new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) }
  catch { return iso }
}
// Fecha+hora de una VENTA (instante UTC del backend) -> hora de Perú.
const fmtFechaHora = (iso?: string) => (iso ? fechaHoraPeru(iso) : '')

/** Estado de la venta → etiqueta + colores del badge. */
const estadoMeta = (estado: string): { label: string; cls: string } => {
  switch (estado) {
    case 'PendienteAprobacion': return { label: 'Pago pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
    case 'Registrada':          return { label: 'Pago realizado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'Rechazada':           return { label: 'Pago rechazado', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
    case 'Anulada':             return { label: 'Anulada',        cls: 'bg-gray-100 text-gray-500 border-gray-200' }
    default:                    return { label: estado,           cls: 'bg-gray-100 text-gray-500 border-gray-200' }
  }
}

/**
 * COLOR DE LA TARJETA según el estado.
 *
 * Antes todas las ventas eran una tarjeta blanca idéntica y el único indicio del
 * estado era un badge pequeño arriba. En una rejilla de 12 ventas eso obliga a
 * LEER cada una para saber cuál está pendiente. El color se ve sin leer: barra
 * lateral + fondo tenue + borde a juego.
 */
const estadoTarjeta = (estado: string): string => {
  switch (estado) {
    case 'PendienteAprobacion':
      return 'border-amber-200 bg-amber-50/40 hover:border-amber-300 border-l-4 border-l-amber-400'
    case 'Registrada':
      return 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 border-l-4 border-l-emerald-500'
    case 'Rechazada':
      return 'border-rose-200 bg-rose-50/30 hover:border-rose-300 border-l-4 border-l-rose-400'
    case 'Anulada':
      return 'border-gray-200 bg-gray-50 opacity-70 hover:opacity-100 border-l-4 border-l-gray-300'
    default:
      return 'border-gray-200 bg-white hover:border-blue-200'
  }
}

const RANGOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'custom', label: 'Personalizado' },
] as const
type RangoKey = typeof RANGOS[number]['key']

const FILTROS = [
  { key: 'PendienteAprobacion', label: 'Pendientes' },
  { key: 'Registrada', label: 'Aceptadas' },
  { key: 'Rechazada', label: 'Rechazadas' },
  { key: 'todas', label: 'Todas' },
] as const
type FiltroKey = typeof FILTROS[number]['key']

export function VentasPage() {
  const hoyISO = isoLocal(new Date())
  const [rango, setRango] = useState<RangoKey>('hoy')
  const [desde, setDesde] = useState(hoyISO)
  const [hasta, setHasta] = useState(hoyISO)
  const [calRango, setCalRango] = useState<'desde' | 'hasta' | null>(null)
  const [filtro, setFiltro] = useState<FiltroKey>('PendienteAprobacion')
  const [idTrabFiltro, setIdTrabFiltro] = useState<number | null>(null)
  const [detail, setDetail] = useState<VentaResumen | null>(null)
  const [cobrar, setCobrar] = useState(false)
  const [escanear, setEscanear] = useState(false)

  // Equipo de la sede (para la barra de filtro por trabajador).
  const { data: trabajadores = [] } = useQuery({
    queryKey: ['trabajadores', 'para-filtro'],
    queryFn: () => trabajadoresService.getTrabajadores(),
    staleTime: 5 * 60 * 1000,
  })

  const { d, h } = useMemo(() => {
    const today = new Date()
    if (rango === 'hoy') return { d: isoLocal(today), h: isoLocal(today) }
    if (rango === 'semana') { const x = new Date(today); x.setDate(x.getDate() - 6); return { d: isoLocal(x), h: isoLocal(today) } }
    if (rango === 'mes') { const x = new Date(today.getFullYear(), today.getMonth(), 1); return { d: isoLocal(x), h: isoLocal(today) } }
    return { d: desde, h: hasta }
  }, [rango, desde, hasta])

  // Ventas del rango, cacheadas por [desde, hasta, trabajador]. El filtro por
  // trabajador es server-side (el listado no trae detalles/barbero por eficiencia).
  const {
    data: ventas = [],
    isLoading: loading,
    refetch,
  } = useQuery<VentaResumen[]>({
    queryKey: ['ventas', d, h, idTrabFiltro],
    queryFn: async () => {
      const data = await ventasService.listarVentas({ desde: d, hasta: h, idTrabajador: idTrabFiltro, tamanoPagina: 200 })
      return Array.isArray(data) ? data : []
    },
  })
  const cargar = () => refetch()

  const counts = useMemo(() => ({
    PendienteAprobacion: ventas.filter(v => v.estado === 'PendienteAprobacion').length,
    Registrada: ventas.filter(v => v.estado === 'Registrada').length,
    Rechazada: ventas.filter(v => v.estado === 'Rechazada').length,
  }), [ventas])

  const totalPendiente = useMemo(
    () => ventas.filter(v => v.estado === 'PendienteAprobacion').reduce((a, v) => a + (Number(v.total) || 0), 0),
    [ventas])
  const totalAceptado = useMemo(
    () => ventas.filter(v => v.estado === 'Registrada').reduce((a, v) => a + (Number(v.total) || 0), 0),
    [ventas])

  const visibles = useMemo(
    () => filtro === 'todas' ? ventas : ventas.filter(v => v.estado === filtro),
    [ventas, filtro])

  const abrirDetalle = async (v: VentaResumen) => {
    setDetail(v) // muestra lo que ya tenemos
    const full = await ventasService.obtenerVenta(v.idVenta) // trae servicios + motivo
    if (full) setDetail(full)
  }

  return (
    <>
      {/* Venta rápida: desktop arriba a la derecha; móvil = barra flotante abajo */}
      <div className="hidden md:flex justify-end gap-2 mb-4">
        <button
          onClick={() => setEscanear(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-95"
          title="Escanear el QR de puntos del cliente"
        >
          <QrCode className="w-5 h-5" /> Escanear QR
        </button>
        <button
          onClick={() => setCobrar(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2.5 font-semibold active:scale-95 transition"
        >
          <CurrencyDollar className="w-5 h-5" /> Venta rápida
        </button>
      </div>
      {/* Móvil: escanear QR (el Fab de abajo es la venta rápida) */}
      <button
        onClick={() => setEscanear(true)}
        className="md:hidden fixed right-4 bottom-24 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-lg active:scale-95"
        aria-label="Escanear QR de puntos"
        title="Escanear QR de puntos"
      >
        <QrCode className="h-5 w-5" />
      </button>
      <Fab onClick={() => setCobrar(true)} label="Venta rápida" icon={CurrencyDollar} color="green" />
      {cobrar && <CobrarVentaModal mode="admin" onClose={() => setCobrar(false)} onDone={() => setCobrar(false)} />}
      {escanear && <EscanearMonederoModal onClose={() => setEscanear(false)} />}

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <ResumenCard icon={Clock} tone="amber" label="Pendientes" value={String(counts.PendienteAprobacion)} />
        <ResumenCard icon={Checks} tone="emerald" label="Aceptadas" value={String(counts.Registrada)} />
        <ResumenCard icon={CurrencyDollar} tone="amber" label="Monto pendiente" value={soles(totalPendiente)} />
        <ResumenCard icon={CurrencyDollar} tone="emerald" label="Monto aceptado" value={soles(totalAceptado)} />
      </div>

      {/* Filtros de fecha — mismo estilo que Inicio (segmented + fecha debajo) */}
      <div className="mb-3">
        <div className="inline-flex gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {RANGOS.map(r => (
            <button key={r.key} onClick={() => setRango(r.key)}
              className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-semibold transition ${rango === r.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>
              {r.label}
            </button>
          ))}
        </div>
        {rango === 'custom' && (
          <div className="flex items-center gap-2 mt-2.5">
            <button onClick={() => setCalRango('desde')} className="inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-900 bg-white whitespace-nowrap"><CalendarDots className="w-3.5 h-3.5 text-blue-600" /> {fmtCorta(desde)}</button>
            <span className="text-gray-400">→</span>
            <button onClick={() => setCalRango('hasta')} className="inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-900 bg-white whitespace-nowrap"><CalendarDots className="w-3.5 h-3.5 text-blue-600" /> {fmtCorta(hasta)}</button>
            <CalendarModal isOpen={calRango === 'desde'} selectedDate={desde} allowPast onSelectDate={(x) => { if (x <= hasta) setDesde(x) }} onClose={() => setCalRango(null)} />
            <CalendarModal isOpen={calRango === 'hasta'} selectedDate={hasta} allowPast onSelectDate={(x) => { if (x >= desde && x <= hoyISO) setHasta(x) }} onClose={() => setCalRango(null)} />
          </div>
        )}
      </div>

      {/* Filtros de estado */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTROS.map(f => {
          const n = f.key === 'todas' ? ventas.length : (counts as any)[f.key] ?? 0
          return (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${filtro === f.key ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {f.label}{n ? ` (${n})` : ''}
            </button>
          )
        })}
      </div>

      {/* Filtro por trabajador */}
      <div className="mb-4">
        <FiltroTrabajador
          trabajadores={(trabajadores as any[]).filter(t => t.estado !== false)}
          value={idTrabFiltro}
          onChange={setIdTrabFiltro}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-4"><SkeletonRows rows={6} cols={4} /></div>
      ) : visibles.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
          <span className="inline-flex w-12 h-12 rounded-2xl bg-gray-100 items-center justify-center mb-3"><CurrencyDollar className="w-6 h-6 text-gray-400" /></span>
          <p className="font-semibold text-gray-700">No hay ventas en este filtro</p>
          <p className="text-sm mt-1">Cambia el rango de fechas o el estado.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibles.map(v => {
            const meta = estadoMeta(v.estado)
            return (
              <button key={v.idVenta} onClick={() => abrirDetalle(v)}
                className={`text-left border rounded-2xl p-4 hover:shadow-md transition ${estadoTarjeta(v.estado)}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                    {v.idReserva ? <><CalendarCheck className="w-3.5 h-3.5" /> Cita</> : <><Storefront className="w-3.5 h-3.5" /> Venta directa</>}
                  </span>
                </div>
                <p className="font-semibold text-gray-900 truncate">Cliente: {v.nombreCliente || 'Cliente a pie'}</p>
                {/* Creado por / Atendido por (Tarea 1): quién la registró vs. quién la atendió (comisión). */}
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><User className="w-3.5 h-3.5 shrink-0" /> Creado por {v.nombreUsuarioRegistra || '—'}</p>
                {v.nombreProfesional && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 truncate"><Scissors className="w-3.5 h-3.5 shrink-0" /> Atendido por {v.nombreProfesional}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-gray-900">{soles(v.total)}</span>
                  <span className="text-xs text-gray-400">{v.metodoPago} · {fmtFechaHora(v.fechaVenta)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-gray-400">
                  {v.rutaImagenEvidencia
                    ? <span className="inline-flex items-center gap-1 text-blue-600"><ImageIcon className="w-3.5 h-3.5" /> Con evidencia</span>
                    : <span className="inline-flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Sin evidencia</span>}
                  {/* Delta de puntos: explica una venta a S/0 o sin evidencia (fue un canje). */}
                  {(v.puntosCanjeados ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700">🎁 −{v.puntosCanjeados} pts</span>
                  )}
                  {(v.puntosGanados ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600">+{v.puntosGanados} pts</span>
                  )}
                  {(v.descuento ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-gray-500">Cortesía {soles(v.descuento!)}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {detail && <DetalleVenta venta={detail} onClose={() => setDetail(null)} onResuelto={async () => { setDetail(null); await cargar() }} />}
      </AnimatePresence>
    </>
  )
}

function ResumenCard({ icon: Icon, tone, label, value }: { icon: any; tone: 'amber' | 'emerald'; label: string; value: string }) {
  const tones: Record<string, { chip: string; num: string }> = {
    amber: { chip: 'bg-amber-50 text-amber-600', num: 'text-amber-600' },
    emerald: { chip: 'bg-emerald-50 text-emerald-600', num: 'text-emerald-600' },
  }
  const t = tones[tone]
  return (
    <div className="bg-white border border-[#ECEEF1] rounded-2xl p-[15px] shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.045em] text-[#9098A4]">{label}</span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.chip}`}><Icon className="w-[18px] h-[18px]" /></span>
      </div>
      <p className={`mt-3.5 text-[1.6rem] leading-none font-extrabold tracking-tight whitespace-nowrap tabular-nums ${t.num}`}>{montoFmt(value, 'text-[0.6em] font-bold opacity-60 mr-0.5')}</p>
    </div>
  )
}

function DetalleVenta({ venta, onClose, onResuelto }: { venta: VentaResumen; onClose: () => void; onResuelto: () => void }) {
  const [modo, setModo] = useState<'ver' | 'rechazar'>('ver')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const meta = estadoMeta(venta.estado)
  const esPendiente = venta.estado === 'PendienteAprobacion'

  const aceptar = async () => {
    setBusy(true)
    try {
      const res: any = await ventasService.aceptar(venta.idVenta)
      toast.success('Venta aceptada · ya cuenta en caja')
      // Al aprobar es cuando la venta del trabajador acredita puntos.
      notificarFidelizacion(res?.fidelizacion)
      onResuelto()
    }
    catch (e: any) { toast.error(mensajeError(e, 'No se pudo aceptar')) } finally { setBusy(false) }
  }
  const rechazar = async () => {
    if (motivo.trim().length < 5) { toast.error('Indica un motivo (mínimo 5 caracteres)'); return }
    setBusy(true)
    try { await ventasService.rechazar(venta.idVenta, motivo.trim()); toast.success('Venta rechazada'); onResuelto() }
    catch (e: any) { toast.error(mensajeError(e, 'No se pudo rechazar')) } finally { setBusy(false) }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        className="relative bg-white w-full sm:max-w-lg rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">Cliente: {venta.nombreCliente || 'Cliente a pie'}</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              {venta.idReserva ? <><CalendarCheck className="w-3.5 h-3.5" /> De una cita</> : <><Storefront className="w-3.5 h-3.5" /> Venta directa</>}
              · {fmtFechaHora(venta.fechaVenta)}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls} mb-3`}>{meta.label}</span>

        {/* Servicios */}
        <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 mb-3">
          {(venta.detalles && venta.detalles.length > 0) ? venta.detalles.map((d, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 text-sm">
              <span className="flex items-center gap-2 min-w-0"><Scissors className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="truncate">{d.nombreServicio}{d.cantidad > 1 ? ` ×${d.cantidad}` : ''}</span></span>
              <span className="text-gray-500 shrink-0">{soles(d.subtotal)}</span>
            </div>
          )) : <div className="p-2.5 text-sm text-gray-400">Cargando servicios…</div>}
          <div className="flex items-center justify-between p-2.5 text-sm font-semibold">
            <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" /> {venta.nombreProfesional || venta.nombreUsuarioRegistra || '—'}</span>
            <span>{soles(venta.total)} · {venta.metodoPago}</span>
          </div>
        </div>

        {/* Creado por / Atendido por (Tarea 1) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
          <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> Creado por <b className="font-semibold text-gray-700">{venta.nombreUsuarioRegistra || '—'}</b></span>
          {venta.nombreProfesional && (
            <span className="inline-flex items-center gap-1"><Scissors className="w-3.5 h-3.5" /> Atendido por <b className="font-semibold text-gray-700">{venta.nombreProfesional}</b></span>
          )}
        </div>

        {/* Evidencia */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Evidencia del pago{venta.numeroOperacion ? ` · Op. ${venta.numeroOperacion}` : ''}</p>
          {venta.rutaImagenEvidencia
            ? <a href={buildImageUrl(venta.rutaImagenEvidencia)} target="_blank" rel="noopener noreferrer"><img src={buildImageUrl(venta.rutaImagenEvidencia)} alt="Evidencia" className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50" /></a>
            : <p className="text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">Sin evidencia adjunta</p>}
        </div>

        {venta.estado === 'Rechazada' && venta.motivoRechazo && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3 mb-3"><strong>Motivo del rechazo:</strong> {venta.motivoRechazo}</p>
        )}

        {/* Acciones (solo si está pendiente) */}
        {esPendiente && modo === 'ver' && (
          <div className="flex gap-2">
            <button onClick={() => setModo('rechazar')} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl py-2.5 font-semibold disabled:opacity-50"><Prohibit className="w-4 h-4" /> Rechazar</button>
            <button onClick={aceptar} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"><Check className="w-4 h-4" /> {busy ? 'Procesando…' : 'Aceptar'}</button>
          </div>
        )}
        {esPendiente && modo === 'rechazar' && (
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Motivo del rechazo (lo verá el trabajador)</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setModo('ver')} disabled={busy} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 font-semibold disabled:opacity-50">Volver</button>
              <button onClick={rechazar} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50"><Prohibit className="w-4 h-4" /> {busy ? 'Rechazando…' : 'Confirmar rechazo'}</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
