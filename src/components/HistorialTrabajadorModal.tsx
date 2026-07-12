import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, CircleNotch, CalendarCheck, Receipt, Image as ImageIcon, Storefront, UserCircle } from '@phosphor-icons/react'
import { buildImageUrl } from '@/services/apiClient'
import { reservasService } from '@/services/reservasService'
import { ventasService, type VentaResumen } from '@/services/ventasService'
import { fechaHoraPeru } from '@/utils/fecha'

type Seccion = 'citas' | 'ventas'

const money = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`

/** Fecha de calendario "yyyy-mm-dd" -> "15 ene 2025" sin tocar zona horaria. */
const fechaDia = (iso?: string) => {
  if (!iso) return ''
  const m = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  try {
    return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`).toLocaleDateString('es-PE', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}
const hhmm = (h?: string) => (h ? h.slice(0, 5) : '')

const estadoReservaCls = (estado?: string): string => {
  switch ((estado || '').toLowerCase()) {
    case 'atendida':
    case 'completada': return 'bg-emerald-50 text-emerald-700'
    case 'confirmada': return 'bg-blue-50 text-blue-700'
    case 'cancelada':  return 'bg-rose-50 text-rose-700'
    case 'noshow':     return 'bg-gray-100 text-gray-500'
    default:           return 'bg-amber-50 text-amber-700'
  }
}
const estadoVentaCls = (estado?: string): string => {
  switch (estado) {
    case 'Registrada':          return 'bg-emerald-50 text-emerald-700'
    case 'PendienteAprobacion': return 'bg-amber-50 text-amber-700'
    case 'Rechazada':           return 'bg-rose-50 text-rose-700'
    default:                    return 'bg-gray-100 text-gray-500'
  }
}
const estadoVentaTxt = (estado?: string): string => {
  switch (estado) {
    case 'Registrada':          return 'Aceptada'
    case 'PendienteAprobacion': return 'Pendiente'
    case 'Rechazada':           return 'Rechazada'
    case 'Anulada':             return 'Anulada'
    default:                    return estado || '—'
  }
}

/**
 * Historial del trabajador — solo lectura. Dos secciones: sus citas y sus
 * ventas (con y sin cita, con evidencia clickeable). Cada venta muestra quién
 * la creó y quién la atendió.
 *
 * Nota (Tarea 1): se retiró la pestaña "Mis pagos"; los pagos/comisiones ya
 * viven en el botón "Comisiones" del menú, así que aquí sería información
 * duplicada. El backend ya restringe cada endpoint al propio trabajador.
 */
export function HistorialTrabajadorModal({
  idTrabajador,
  onClose,
}: {
  idTrabajador: number
  onClose: () => void
}) {
  const [seccion, setSeccion] = useState<Seccion>('citas')
  const [verImagen, setVerImagen] = useState<string | null>(null)
  const [rango, setRango] = useState<'todo' | 'hoy' | 'semana' | 'mes'>('mes')
  const [limite, setLimite] = useState(5)
  useEffect(() => { setLimite(5) }, [seccion, rango])

  const enRango = (iso?: string) => {
    if (rango === 'todo' || !iso) return true
    const d = new Date(iso)
    if (isNaN(d.getTime())) return true
    const now = new Date()
    const hoy0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (rango === 'hoy') return d >= hoy0
    if (rango === 'semana') { const s = new Date(hoy0); s.setDate(s.getDate() - 6); return d >= s }
    const s = new Date(hoy0); s.setMonth(s.getMonth() - 1); return d >= s
  }

  const citas = useQuery({
    queryKey: ['historial-trab', 'citas', idTrabajador],
    queryFn: () => reservasService.getReservas(),
    enabled: seccion === 'citas',
  })
  const ventas = useQuery<VentaResumen[]>({
    queryKey: ['historial-trab', 'ventas', idTrabajador],
    queryFn: () => ventasService.listarVentas({ tamanoPagina: 200 }),
    enabled: seccion === 'ventas',
  })

  const tabs: { key: Seccion; label: string; icon: any }[] = [
    { key: 'citas', label: 'Mis citas', icon: CalendarCheck },
    { key: 'ventas', label: 'Mis ventas', icon: Receipt },
  ]

  const cargando = (seccion === 'citas' && citas.isLoading)
    || (seccion === 'ventas' && ventas.isLoading)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Mi historial</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Segmentos */}
        <div className="px-4 pt-3">
          <div className="inline-flex w-full gap-1 p-1 bg-gray-100 rounded-xl">
            {tabs.map(t => {
              const activo = seccion === t.key
              const Ico = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => setSeccion(t.key)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-semibold transition ${activo ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  <Ico size={15} weight={activo ? 'fill' : 'regular'} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtro por fecha */}
        <div className="px-4 pt-2">
          <div className="inline-flex w-full gap-1 text-xs">
            {([['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes'], ['todo', 'Todo']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setRango(k)}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${rango === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-800'}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto p-4">
          {cargando ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <CircleNotch className="animate-spin" size={24} />
            </div>
          ) : (() => {
            const citasF = (citas.data || []).filter((r: any) => enRango(r.fechaReserva))
            const ventasF = (ventas.data || []).filter(v => enRango(v.fechaVenta))
            const total = seccion === 'citas' ? citasF.length : ventasF.length
            return (
              <>
                {seccion === 'citas'
                  ? <SeccionCitas reservas={citasF.slice(0, limite)} />
                  : <SeccionVentas ventas={ventasF.slice(0, limite)} onVerImagen={setVerImagen} />}
                {total > limite && (
                  <button onClick={() => setLimite(l => l + 10)}
                    className="mt-3 w-full py-2 rounded-xl border border-gray-200 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition">
                    Ver más ({total - limite})
                  </button>
                )}
              </>
            )
          })()}
        </div>
      </div>

      {verImagen && <ImagenViewer url={verImagen} onClose={() => setVerImagen(null)} />}
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-gray-500 text-sm py-10 text-center">{texto}</p>
}

function SeccionCitas({ reservas }: { reservas: any[] }) {
  if (reservas.length === 0) return <Vacio texto="Aún no tienes citas registradas." />
  return (
    <div className="grid gap-2.5">
      {reservas.map((r, i) => {
        const x: any = r
        const servicio = x.nombreServicio || x.servicios?.[0]?.nombre || 'Servicio'
        return (
          <div key={x.idReserva || i} className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 truncate">{x.nombreCliente || x.nombreClienteSnap || 'Cliente'}</p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${estadoReservaCls(x.estado)}`}>{x.estado || '—'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {fechaDia(x.fechaReserva)} · {hhmm(x.horaInicio)}{x.horaFin ? `–${hhmm(x.horaFin)}` : ''} · {servicio}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function SeccionVentas({ ventas, onVerImagen }: { ventas: VentaResumen[]; onVerImagen: (u: string) => void }) {
  if (ventas.length === 0) return <Vacio texto="Aún no tienes ventas registradas." />
  return (
    <div className="grid gap-2.5">
      {ventas.map(v => (
        <div key={v.idVenta} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
          {v.rutaImagenEvidencia ? (
            <button onClick={() => onVerImagen(buildImageUrl(v.rutaImagenEvidencia))} className="shrink-0" title="Ver evidencia">
              <img src={buildImageUrl(v.rutaImagenEvidencia)} alt="evidencia" className="w-12 h-12 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-blue-400 transition" />
            </button>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-50 text-gray-300 flex items-center justify-center shrink-0" title="Sin evidencia">
              <ImageIcon size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{money(v.total)}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${estadoVentaCls(v.estado)}`}>{estadoVentaTxt(v.estado)}</span>
            </div>
            <p className="text-xs text-gray-500">
              {fechaHoraPeru(v.fechaVenta)} · {v.metodoPago}
            </p>
            {/* Creado por / Atendido por (Tarea 1) */}
            <p className="text-[11px] text-gray-400 inline-flex items-center gap-1 mt-0.5">
              <UserCircle size={12} weight="duotone" />
              Creado por {v.nombreUsuarioRegistra || '—'}
              {v.nombreProfesional ? ` · Atendido por ${v.nombreProfesional}` : ''}
            </p>
            <p className="text-[11px] text-gray-400 inline-flex items-center gap-1 mt-0.5">
              {v.idReserva ? <><CalendarCheck size={12} /> De una cita</> : <><Storefront size={12} /> Venta directa</>}
              {v.nombreCliente ? ` · ${v.nombreCliente}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ImagenViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white" aria-label="Cerrar">
        <X size={28} />
      </button>
      <img src={url} alt="Evidencia" onClick={e => e.stopPropagation()} className="max-w-full max-h-full rounded-xl object-contain" />
    </div>
  )
}
