import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Fab } from '@/components/Fab'
import { AgendaBoard, type TrabajadorPropio } from '@/components/AgendaBoard'
import { CalendarModal } from '@/pages/cliente/CalendarModal'
import {
  CalendarCheck, Check, X, DollarSign, Star, Wallet, Camera, AlertTriangle,
  CalendarDays, CalendarOff, Plus, Trash2, Mail, Phone, Home, Clock, Calendar, MapPin, Menu,
} from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import { useAuthStore } from '@/store/authStore'
import { reservasService } from '@/services/reservasService'
import { ventasService, type VentaResumen } from '@/services/ventasService'
import { montoFmt } from '@/utils/kpiMonto'
import { mensajeError } from '@/utils/apiError'
import {
  panelTrabajadorService,
  type MisComisiones, type PagoTrabajador, type ResenaTrabajador,
  type DisponibilidadDia, type DescansoTrabajador, type MiPerfilTrabajador,
} from '@/services/panelTrabajadorService'
import { AccountMenu } from '@/components/AccountMenu'
import { CompletaTuPerfil } from '@/components/CompletaTuPerfil'
import { buildImageUrl, setTenant } from '@/services/apiClient'
import { CobrarVentaModal } from '@/components/CobrarVentaModal'
import { TrabajadorMenu } from '@/components/TrabajadorMenu'
import { HistorialTrabajadorModal } from '@/components/HistorialTrabajadorModal'
import { fechaPeru } from '@/utils/fecha'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const METODOS = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia', 'Otro']
const TIPOS_DESCANSO = ['Vacaciones', 'Permiso', 'Médico', 'Personal', 'Otro']
const hoyISO = () => new Date().toISOString().slice(0, 10)
const franjaDeHora = (h?: string): 'manana' | 'tarde' | 'noche' => {
  const n = parseInt((h || '').slice(0, 2), 10) || 0
  return n < 12 ? 'manana' : n < 18 ? 'tarde' : 'noche'   // <12 mañana · 12-18 tarde · ≥18 noche
}
const FRANJAS_T = [
  { key: 'todo', label: 'Todo' },
  { key: 'manana', label: 'Mañana' },
  { key: 'tarde', label: 'Tarde' },
  { key: 'noche', label: 'Noche' },
]
const soles = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`
const rid = (r: any) => r.idReserva ?? r.id
const fmtDia = (iso?: string) => iso
  ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  : ''

type Tab = 'inicio' | 'agenda' | 'disponibilidad' | 'comisiones' | 'resenas'

export function TrabajadorMiAgenda() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('inicio')
  const [idT, setIdT] = useState<number | null>(null)
  const [idSede, setIdSede] = useState<number | null>(null)
  const [perfil, setPerfil] = useState<MiPerfilTrabajador | null>(null)
  const [comisiones, setComisiones] = useState<MisComisiones | null>(null)
  const [reservas, setReservas] = useState<any[]>([])
  const [nombre, setNombre] = useState<string | undefined>(undefined)
  const [foto, setFoto] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [atender, setAtender] = useState<any | null>(null)
  const [cobrar, setCobrar] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)

  const showConfig = params.get('config') === '1'
  const cerrarConfig = () => { params.delete('config'); setParams(params, { replace: true }) }
  const abrirConfig = () => { params.set('config', '1'); setParams(params, { replace: true }) }

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [per, com, res] = await Promise.all([
        panelTrabajadorService.getMiPerfil(),
        panelTrabajadorService.getMisComisiones(),
        reservasService.getReservas(),
      ])
      setComisiones(com)
      const lista = Array.isArray(res) ? res : []
      setReservas(lista)
      setPerfil(per)
      // Fija el tenant a la sede del trabajador, para que los endpoints resueltos
      // por subdominio (p.ej. /api/Servicios del walk-in) apunten a SU sede.
      if (per?.subdominio) { try { setTenant(per.subdominio) } catch { /* noop */ } }
      setIdT(per?.idTrabajador ?? com?.idTrabajador ?? lista.find(r => r.idTrabajador)?.idTrabajador ?? null)
      setIdSede(per?.idSede ?? null)
      setNombre(per?.nombreCompleto || user?.nombreCompleto)
      setFoto(per?.urlFotoPerfil)
    } catch { toast.error('No se pudo cargar tu panel') } finally { setLoading(false) }
  }

  const hoyCount = useMemo(() => {
    const h = hoyISO()
    return reservas.filter(r => ['Pendiente', 'Confirmada', 'Reprogramada'].includes(r.estado) && (r.fechaReserva || '').slice(0, 10) === h).length
  }, [reservas])
  const atendidasHoy = useMemo(() => reservas.filter(r => r.estado === 'Atendida' && (r.fechaReserva || '').slice(0, 10) === hoyISO()).length, [reservas])

  const trabajadorPropio: TrabajadorPropio | undefined = useMemo(
    () => (idT != null ? { idTrabajador: idT, nombreCompleto: nombre, urlFotoPerfil: foto } : undefined),
    [idT, nombre, foto],
  )

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'inicio', label: 'Inicio', icon: Home },
    { key: 'agenda', label: 'Agenda', icon: CalendarCheck },
    { key: 'disponibilidad', label: 'Horario', icon: CalendarDays },
    { key: 'comisiones', label: 'Comisiones', icon: DollarSign },
    { key: 'resenas', label: 'Reseñas', icon: Star },
  ]

  // "Mi Sitio": abre el sitio público de su sede (subdominio de marca). En
  // localhost apunta a producción, que para "ver mi sitio" es correcto.
  const irMiSitio = () => {
    if (perfil?.subdominio) window.open(`https://${perfil.subdominio}.barber.pe`, '_blank')
    else navigate('/')
  }

  // El + genera una venta/reserva en SU sede (el wizard resuelve la sede por el
  // tenant activo = su subdominio). Sin sede (caso teórico), al sitio principal.
  const irReservar = () => {
    if (idSede) { navigate('/reservar-publica'); return }
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('barber.pe')) {
      window.location.href = 'https://barber.pe'
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header limpio: marca + cuenta */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="flex items-center" aria-label="Ir al inicio">
              <img src="/barber-logo-black.png" alt="Barber.PE" className="h-7 w-auto" />
            </button>
            <button onClick={() => setMenuOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
              aria-label="Abrir menú">
              <Menu className="w-4 h-4" /> Menú
            </button>
          </div>
          {perfil?.nombreSede && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-white max-w-[55%]">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <div className="min-w-0 leading-tight">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Sede activa</p>
                <p className="text-xs font-bold text-gray-900 truncate">{perfil.nombreSede}</p>
              </div>
            </div>
          )}
          <AccountMenu variant="plain" siteLink />
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 py-6 pb-28 md:pb-10">
        {/* Navegación y acciones ahora viven en el botón "Menú" del header */}

        {loading ? (
          <div className="text-center py-12 text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" /> Cargando…</div>
        ) : tab === 'inicio' ? (
          <InicioTab
            nombre={nombre}
            hoyCount={hoyCount}
            atendidasHoy={atendidasHoy}
            comisiones={comisiones}
            reservas={reservas}
            perfil={perfil}
            onCompletar={abrirConfig}
            onAtender={(r) => setAtender(r)}
          />
        ) : tab === 'agenda' ? (
          trabajadorPropio
            ? <AgendaBoard mode="trabajador" trabajadorPropio={trabajadorPropio} onAtenderTrabajador={(r) => setAtender(r)} />
            : <p className="text-sm text-gray-400 bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center">No se pudo identificar tu perfil.</p>
        ) : tab === 'disponibilidad' ? (
          <DisponibilidadTab idT={idT} idSede={idSede} />
        ) : tab === 'comisiones' ? (
          <ComisionesTab idT={idT} comisiones={comisiones} />
        ) : (
          <ResenasTab idT={idT} />
        )}
      </div>

      {atender && <AtenderModal reserva={atender} onClose={() => setAtender(null)} onDone={async () => { setAtender(null); await cargar() }} />}

      {cobrar && idT != null && <CobrarVentaModal mode="trabajador" lockTrabajadorId={idT} onClose={() => setCobrar(false)} onDone={async () => { setCobrar(false); await cargar() }} />}

      <TrabajadorMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        tab={tab}
        onTab={setTab}
        onVentaRapida={() => setCobrar(true)}
        onReservar={irReservar}
        onMiSitio={irMiSitio}
        onHistorial={() => setHistorialOpen(true)}
        nombreSede={perfil?.nombreSede}
      />

      {historialOpen && idT != null && (
        <HistorialTrabajadorModal idTrabajador={idT} onClose={() => setHistorialOpen(false)} />
      )}

      {showConfig && <ConfigModal perfil={perfil} onClose={cerrarConfig} onSaved={async () => { await cargar() }} />}
    </div>
  )
}

/* ---------- KPI ---------- */
function Kpi({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: string }) {
  const map: Record<string, { chip: string; num: string }> = {
    blue: { chip: 'bg-blue-50 text-blue-600', num: 'text-blue-600' },
    emerald: { chip: 'bg-emerald-50 text-emerald-600', num: 'text-emerald-600' },
    violet: { chip: 'bg-violet-50 text-violet-600', num: 'text-violet-600' },
    amber: { chip: 'bg-amber-50 text-amber-600', num: 'text-amber-600' },
  }
  const t = map[tone] || { chip: 'bg-gray-100 text-gray-600', num: 'text-gray-900' }
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

/* ---------- Inicio (mini-dashboard de HOY) ---------- */
/* ---------- Aviso de ventas rechazadas (el trabajador re-sube evidencia) ---------- */
function VentasRechazadasAviso() {
  const [ventas, setVentas] = useState<VentaResumen[]>([])
  const [reenviar, setReenviar] = useState<VentaResumen | null>(null)

  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const cargar = async () => {
    try {
      const hoy = new Date(); const desde = new Date(hoy); desde.setDate(desde.getDate() - 30)
      const data = await ventasService.listarVentas({ estado: 'Rechazada', desde: iso(desde), hasta: iso(hoy), tamanoPagina: 50 })
      setVentas(Array.isArray(data) ? data : [])
    } catch { /* silencioso: no romper el inicio */ }
  }
  useEffect(() => { cargar() }, [])

  if (ventas.length === 0) return null
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
      <p className="font-semibold text-rose-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Tienes {ventas.length} venta{ventas.length > 1 ? 's' : ''} rechazada{ventas.length > 1 ? 's' : ''}</p>
      <p className="text-xs text-rose-700 mt-0.5">Revisa el motivo y vuelve a subir la evidencia para que el administrador la apruebe.</p>
      <div className="mt-3 space-y-2">
        {ventas.map(v => (
          <div key={v.idVenta} className="bg-white border border-rose-100 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-900 truncate">{v.nombreCliente || 'Cliente a pie'}</span>
              <span className="text-sm text-gray-500 shrink-0">{soles(v.total)} · {v.metodoPago}</span>
            </div>
            {v.motivoRechazo && <p className="text-xs text-rose-700 mt-1"><strong>Motivo:</strong> {v.motivoRechazo}</p>}
            <button onClick={() => setReenviar(v)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-800">
              <Camera className="w-3.5 h-3.5" /> Reenviar evidencia
            </button>
          </div>
        ))}
      </div>
      {reenviar && <ReenviarEvidenciaModal venta={reenviar} onClose={() => setReenviar(null)} onDone={async () => { setReenviar(null); await cargar() }} />}
    </div>
  )
}

function ReenviarEvidenciaModal({ venta, onClose, onDone }: { venta: VentaResumen; onClose: () => void; onDone: () => void }) {
  const [evidencia, setEvidencia] = useState('')
  const [operacion, setOperacion] = useState(venta.numeroOperacion || '')
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)

  const subir = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { const url = await panelTrabajadorService.subirEvidencia(file); setEvidencia(url); toast.success('Imagen subida') }
    catch { toast.error('No se pudo subir la imagen') } finally { setSubiendo(false) }
  }
  const confirmar = async () => {
    if (!evidencia) { toast.error('Adjunta la nueva evidencia'); return }
    setSaving(true)
    try {
      await ventasService.reenviarEvidencia(venta.idVenta, evidencia, operacion.trim() || undefined)
      toast.success('Evidencia reenviada · pendiente de aprobación')
      onDone()
    } catch (e: any) { toast.error(mensajeError(e, 'No se pudo reenviar')) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Reenviar evidencia</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {venta.motivoRechazo && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3 mb-3"><strong>Motivo del rechazo:</strong> {venta.motivoRechazo}</p>
        )}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{venta.nombreCliente || 'Cliente a pie'}</span>
            <span className="font-semibold text-gray-900">{soles(venta.total)} · {venta.metodoPago}</span>
          </div>
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Nueva evidencia del pago <span className="text-rose-500 font-medium">(obligatoria)</span></label>
            <input type="file" accept="image/*" onChange={subir} className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:px-3 file:py-1.5 file:text-sm file:font-medium" />
            {subiendo && <p className="text-xs text-gray-400 mt-1">Subiendo…</p>}
            {evidencia && <img src={evidencia} alt="evidencia" className="mt-2 rounded-lg max-h-40 border border-gray-200" />}
          </div>
          <div>
            <label className="text-xs text-gray-500">N° de operación (opcional)</label>
            <input value={operacion} onChange={e => setOperacion(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={confirmar} disabled={saving || subiendo || !evidencia} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">
            {saving ? 'Reenviando…' : 'Reenviar para aprobación'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InicioTab({ nombre, hoyCount, atendidasHoy, comisiones, reservas, perfil, onCompletar, onAtender }: {
  nombre?: string
  hoyCount: number
  atendidasHoy: number
  comisiones: MisComisiones | null
  reservas: any[]
  perfil: MiPerfilTrabajador | null
  onCompletar: () => void
  onAtender: (r: any) => void
}) {
  const hoy = hoyISO()
  const [franjaT, setFranjaT] = useState('todo')
  const citasHoyBase = reservas
    .filter(r => (r.fechaReserva || '').slice(0, 10) === hoy && (r.estado || '') !== 'Cancelada')
    .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
  const citasHoy = franjaT === 'todo' ? citasHoyBase : citasHoyBase.filter(r => franjaDeHora(r.horaInicio) === franjaT)
  const countFranjaT = (f: string) => f === 'todo' ? citasHoyBase.length : citasHoyBase.filter(r => franjaDeHora(r.horaInicio) === f).length

  const fechaLarga = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
  const primerNombre = (nombre || '').trim().split(/\s+/)[0]

  const badge = (estado: string) => {
    const e = (estado || '').toLowerCase()
    if (e === 'atendida') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (e === 'confirmada') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (e === 'noshow' || e === 'no_show') return 'bg-rose-50 text-rose-700 border-rose-200'
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  const accionable = (estado: string) => ['pendiente', 'confirmada', 'reprogramada'].includes((estado || '').toLowerCase())

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Hola{primerNombre ? `, ${primerNombre}` : ''} 👋</h2>
        <p className="text-sm text-gray-500 capitalize">{fechaLarga} · tu resumen de hoy</p>
      </div>

      {/* Aviso: ventas rechazadas por el admin (re-subir evidencia) */}
      <VentasRechazadasAviso />

      {/* KPIs de hoy */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={CalendarCheck} tone="blue" label="Citas hoy" value={String(hoyCount)} />
        <Kpi icon={Check} tone="emerald" label="Atendidas hoy" value={String(atendidasHoy)} />
        <Kpi icon={Wallet} tone="violet" label="Comisión pendiente" value={soles(comisiones?.comisionesTotalPendiente)} />
        <Kpi icon={DollarSign} tone="amber" label="Comisión pagada" value={soles(comisiones?.comisionesTotalPagado)} />
      </div>

      {/* Completa tu perfil */}
      {perfil && (
        <CompletaTuPerfil
          pasos={[
            { clave: 'foto', etiqueta: 'Foto de perfil', hecho: !!perfil.urlFotoPerfil },
            { clave: 'telefono', etiqueta: 'Tu teléfono', hecho: !!perfil.telefono },
            { clave: 'especialidad', etiqueta: 'Especialidad', hecho: !!perfil.especialidad },
            { clave: 'experiencia', etiqueta: 'Experiencia', hecho: !!perfil.experiencia },
            { clave: 'descripcion', etiqueta: 'Descripción', hecho: !!perfil.descripcion },
          ]}
          onCompletar={onCompletar}
          nota="Estos datos son los que ven tus clientes en tu perfil público."
        />
      )}

      {/* Citas de hoy */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Citas de hoy</h3>
        {/* Filtro por franja: Todo / Mañana / Tarde / Noche */}
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-3">
          {FRANJAS_T.map(f => (
            <button key={f.key} onClick={() => setFranjaT(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${franjaT === f.key ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>
              {f.label} <span className="opacity-60">{countFranjaT(f.key)}</span>
            </button>
          ))}
        </div>
        {citasHoy.length === 0 ? (
          <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl p-6 text-center">{citasHoyBase.length === 0 ? 'No tienes citas para hoy.' : 'No tienes citas en esta franja.'}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {citasHoy.map(r => (
              <div key={rid(r)} className="flex items-center gap-3 py-3">
                <div className="w-14 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">{(r.horaInicio || '').slice(0, 5)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.nombreCliente || r.nombreClienteSnap || 'Cliente'}</p>
                  {r.nombreServicio && <p className="text-xs text-gray-400 truncate">{r.nombreServicio}</p>}
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${badge(r.estado)}`}>{r.estado}</span>
                {accionable(r.estado) && (
                  <button onClick={() => onAtender(r)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0">Atender</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Horario (disponibilidad semanal + no disponibilidad) ---------- */
function DisponibilidadTab({ idT, idSede }: { idT: number | null; idSede: number | null }) {
  const [dias, setDias] = useState<{ activo: boolean; horaInicio: string; horaFin: string }[]>(
    DIAS.map(() => ({ activo: false, horaInicio: '09:00', horaFin: '18:00' })),
  )
  const [sede, setSede] = useState<Record<number, { ini: string; fin: string }>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!idSede || !idT) return
    let cancel = false
    Promise.all([
      panelTrabajadorService.getHorariosSede(idSede),
      panelTrabajadorService.getDisponibilidad(idT),
    ]).then(([hs, disp]) => {
      if (cancel) return
      const map: Record<number, { ini: string; fin: string }> = {}
      hs.filter(h => h.estaActivo).forEach(h => { map[h.diaSemana] = { ini: (h.horaInicio || '').slice(0, 5), fin: (h.horaFin || '').slice(0, 5) } })
      setSede(map)

      const base = DIAS.map((_, i) => {
        const s = map[i]
        return { activo: false, horaInicio: s?.ini || '09:00', horaFin: s?.fin || '18:00' }
      })
      if (disp.length > 0) {
        disp.forEach(x => { base[x.diaSemana] = { activo: true, horaInicio: (x.horaInicio || '09:00').slice(0, 5), horaFin: (x.horaFin || '18:00').slice(0, 5) } })
      } else {
        Object.keys(map).forEach(k => { const i = Number(k); base[i] = { activo: true, horaInicio: map[i].ini, horaFin: map[i].fin } })
      }
      setDias(base)
    })
    return () => { cancel = true }
  }, [idSede, idT])

  const guardar = async () => {
    if (!idT) return toast.error('No se pudo identificar tu perfil')
    for (let i = 0; i < 7; i++) {
      if (!dias[i].activo) continue
      const s = sede[i]
      if (!s) return toast.error(`La sede no atiende los ${DIAS[i]}. Desactiva ese día.`)
      if (dias[i].horaInicio < s.ini || dias[i].horaFin > s.fin)
        return toast.error(`${DIAS[i]}: tu horario debe estar dentro de ${s.ini}–${s.fin} (sede).`)
      if (dias[i].horaInicio >= dias[i].horaFin)
        return toast.error(`${DIAS[i]}: la hora de inicio debe ser menor a la de fin.`)
    }
    const payload: DisponibilidadDia[] = dias
      .map((d, i) => ({ ...d, diaSemana: i }))
      .filter(d => d.activo)
      .map(d => ({ diaSemana: d.diaSemana, horaInicio: `${d.horaInicio}:00`, horaFin: `${d.horaFin}:00` }))
    if (payload.length === 0) return toast.error('Activa al menos un día')
    setSaving(true)
    try { await panelTrabajadorService.guardarDisponibilidad(idT, payload); toast.success('Horario guardado') }
    catch (e: any) { toast.error(mensajeError(e, 'No se pudo guardar')) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      {/* Horario semanal */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 max-w-2xl">
        <h3 className="font-semibold text-gray-900 mb-1">Mi horario semanal</h3>
        <p className="text-sm text-gray-500 mb-4">Marca los días que atiendes. Tu horario debe estar dentro del horario de atención de la sede.</p>
        <div className="divide-y divide-gray-100">
          {DIAS.map((nombre, i) => {
            const s = sede[i]
            const cerrado = !s
            const activo = dias[i].activo && !cerrado
            const toggle = () => {
              if (cerrado) return
              setDias(d => d.map((x, j) => j === i
                ? { ...x, activo: !x.activo, horaInicio: !x.activo && s ? s.ini : x.horaInicio, horaFin: !x.activo && s ? s.fin : x.horaFin }
                : x))
            }
            return (
              <div key={i} className="flex items-center justify-between gap-3 py-3 flex-wrap">
                <button type="button" onClick={toggle} disabled={cerrado}
                  className={`flex items-center gap-2.5 text-left transition ${cerrado ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${activo ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${activo ? 'left-[1.125rem]' : 'left-0.5'}`} />
                  </span>
                  <span>
                    <span className={`block text-sm font-medium ${activo ? 'text-gray-900' : 'text-gray-500'}`}>{nombre}</span>
                    <span className="block text-[11px] text-gray-400">{cerrado ? 'Sede cerrada' : `Sede ${s.ini}–${s.fin}`}</span>
                  </span>
                </button>

                {cerrado ? (
                  <span className="text-sm text-gray-300">—</span>
                ) : activo ? (
                  <div className="flex items-center gap-2">
                    <input type="time" min={s.ini} max={s.fin} value={dias[i].horaInicio}
                      onChange={e => setDias(d => d.map((x, j) => j === i ? { ...x, horaInicio: e.target.value } : x))}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-gray-300">—</span>
                    <input type="time" min={s.ini} max={s.fin} value={dias[i].horaFin}
                      onChange={e => setDias(d => d.map((x, j) => j === i ? { ...x, horaFin: e.target.value } : x))}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ) : (
                  <span className="text-sm text-gray-300">No atiendo</span>
                )}
              </div>
            )
          })}
        </div>
        <button onClick={guardar} disabled={saving} className="mt-4 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar horario'}</button>
      </div>

      {/* No disponibilidad / descansos */}
      <DescansosSection idT={idT} idSede={idSede} />
    </div>
  )
}

/* ---------- No disponibilidad (DescansoTrabajador) ---------- */
function DescansosSection({ idT, idSede }: { idT: number | null; idSede: number | null }) {
  const [items, setItems] = useState<DescansoTrabajador[]>([])
  const [tipo, setTipo] = useState(TIPOS_DESCANSO[0])
  const [ini, setIni] = useState('')
  const [fin, setFin] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [calOpen, setCalOpen] = useState<'ini' | 'fin' | null>(null)

  const cargar = () => { if (idT) panelTrabajadorService.getDescansos(idT).then(setItems) }
  useEffect(() => { cargar() }, [idT])

  const solicitar = async () => {
    if (!idT || !idSede) return toast.error('No se pudo identificar tu sede')
    if (!ini || !fin) return toast.error('Elige la fecha de inicio y de fin')
    if (ini > fin) return toast.error('La fecha de inicio no puede ser mayor a la de fin')
    setSaving(true)
    try {
      await panelTrabajadorService.solicitarDescanso(idSede, {
        idTrabajador: idT,
        fechaInicio: `${ini}T00:00:00`,
        fechaFin: `${fin}T23:59:59`,
        tipo,
        motivo: motivo.trim(),
      })
      toast.success('Descanso solicitado · queda pendiente de aprobación')
      setIni(''); setFin(''); setMotivo(''); setTipo(TIPOS_DESCANSO[0])
      cargar()
    } catch (e: any) { toast.error(mensajeError(e, 'No se pudo solicitar')) } finally { setSaving(false) }
  }

  const eliminar = async (id: number) => {
    if (!(await confirmDialog({
      title: 'Eliminar descanso',
      message: '¿Eliminar este descanso?',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      tone: 'danger',
    }))) return
    try { await panelTrabajadorService.eliminarDescanso(id); toast.success('Descanso eliminado'); cargar() }
    catch { toast.error('No se pudo eliminar') }
  }

  const field = 'border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
  const fmtFechaCorta = (iso: string) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  const triggerBtn = 'w-full flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-left bg-white hover:border-blue-300 transition'
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 max-w-2xl">
      <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><CalendarOff className="w-5 h-5 text-gray-500" /> No disponibilidad</h3>
      <p className="text-sm text-gray-500 mb-4">Solicita días libres (vacaciones, permiso, etc.). Esto <b>no borra</b> tu horario semanal; solo bloquea esas fechas una vez que el administrador lo apruebe.</p>

      {/* Formulario */}
      <div className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select className={`${field} w-full`} value={tipo} onChange={e => setTipo(e.target.value)}>{TIPOS_DESCANSO.map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <button type="button" onClick={() => setCalOpen('ini')} className={triggerBtn}>
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className={ini ? 'text-gray-900' : 'text-gray-400'}>{ini ? fmtFechaCorta(ini) : 'Elegir fecha'}</span>
            </button>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <button type="button" onClick={() => setCalOpen('fin')} className={triggerBtn}>
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className={fin ? 'text-gray-900' : 'text-gray-400'}>{fin ? fmtFechaCorta(fin) : 'Elegir fecha'}</span>
            </button>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Motivo (opcional)</label>
            <input className={`${field} w-full`} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. viaje familiar" />
          </div>
        </div>
        <button onClick={solicitar} disabled={saving} className="mt-3 inline-flex items-center justify-center gap-1.5 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          <Plus className="w-4 h-4" /> {saving ? 'Enviando…' : 'Solicitar'}
        </button>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl p-4 text-center">No tienes descansos registrados.</p>
      ) : (
        <div className="space-y-2">
          {items.map(d => (
            <div key={d.idDescanso} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{fmtDia(d.fechaInicio)} – {fmtDia(d.fechaFin)} <span className="text-xs font-normal text-gray-500">· {d.tipo}</span></p>
                {d.motivo && <p className="text-xs text-gray-400">{d.motivo}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${d.estaAprobado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {d.estaAprobado ? 'Aprobado' : 'Pendiente'}
                </span>
                <button onClick={() => eliminar(d.idDescanso)} className="text-gray-400 hover:text-rose-600 transition" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendario reutilizable (mismo de la agenda). Sin fechas pasadas. */}
      <CalendarModal
        isOpen={calOpen !== null}
        selectedDate={calOpen === 'fin' ? fin : ini}
        onSelectDate={(date) => { if (calOpen === 'fin') setFin(date); else setIni(date) }}
        onClose={() => setCalOpen(null)}
      />
    </div>
  )
}

/* ---------- Comisiones ---------- */
function ComisionesTab({ idT, comisiones }: { idT: number | null; comisiones: MisComisiones | null }) {
  const [pagos, setPagos] = useState<PagoTrabajador[]>([])
  useEffect(() => { if (idT) panelTrabajadorService.getMisPagos(idT).then(setPagos) }, [idT])
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Kpi icon={Wallet} tone="violet" label="Ganado (total)" value={soles(comisiones?.comisionesTotalCalculado)} />
        <Kpi icon={Clock} tone="amber" label="Pendiente de pago" value={soles(comisiones?.comisionesTotalPendiente)} />
        <Kpi icon={Check} tone="emerald" label="Pagado" value={soles(comisiones?.comisionesTotalPagado)} />
      </div>
      <section>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Wallet className="w-5 h-5 text-gray-500" /> Historial de pagos</h3>
        {pagos.length === 0 ? <p className="text-sm text-gray-400 bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center">Aún no tienes pagos registrados.</p>
          : <div className="space-y-2">{pagos.map(p => (
            <div key={p.idPago} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{soles(p.montoPagado)} <span className="text-xs font-normal text-gray-500">· {p.metodoPago}</span></p>
                <p className="text-xs text-gray-500">{fechaPeru(p.fechaPago)} · por {p.nombreUsuarioRegistra}</p>
                {p.observacion && <p className="text-xs text-gray-400">{p.observacion}</p>}
              </div>
              {p.rutaImagenEvidencia && <a href={p.rutaImagenEvidencia} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline shrink-0">Ver comprobante</a>}
            </div>
          ))}</div>}
      </section>
    </div>
  )
}

/* ---------- Reseñas ---------- */
function ResenasTab({ idT }: { idT: number | null }) {
  const [items, setItems] = useState<ResenaTrabajador[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { if (idT) panelTrabajadorService.getMisResenas(idT).then(d => { setItems(d); setLoaded(true) }) }, [idT])
  const prom = items.length ? (items.reduce((s, r) => s + r.puntuacion, 0) / items.length).toFixed(1) : '—'
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
        <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
        <div><p className="text-2xl font-bold text-gray-900">{prom}</p><p className="text-xs text-gray-500">{items.length} {items.length === 1 ? 'reseña' : 'reseñas'}</p></div>
      </div>
      {loaded && items.length === 0 ? <p className="text-sm text-gray-400 bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center">Aún no tienes reseñas.</p>
        : <div className="space-y-2">{items.map(r => (
          <div key={r.idCalificacion} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">{r.nombreCliente || 'Cliente'}</p>
              <span className="inline-flex items-center gap-0.5">{[1, 2, 3, 4, 5].map(n => <Star key={n} className={`w-4 h-4 ${n <= r.puntuacion ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />)}</span>
            </div>
            {r.comentario && <p className="text-sm text-gray-600 mt-1">{r.comentario}</p>}
            <p className="text-xs text-gray-400 mt-1">{fechaPeru(r.fechaCreacion)}</p>
          </div>
        ))}</div>}
    </div>
  )
}

/* ---------- Modal Atender (+ evidencia) ---------- */
function Shell({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white w-full sm:max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-900">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
        {children}
      </motion.div>
    </div>
  )
}

function AtenderModal({ reserva, onClose, onDone }: any) {
  const [metodo, setMetodo] = useState('Efectivo')
  const [operacion, setOperacion] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)
  const total = reserva.precioServicio ?? reserva.precioServicioSnap

  const subir = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { const url = await panelTrabajadorService.subirEvidencia(file); setEvidencia(url); toast.success('Evidencia subida') }
    catch { toast.error('No se pudo subir la imagen') } finally { setSubiendo(false) }
  }
  const confirmar = async () => {
    if (!evidencia) { toast.error('Adjunta la evidencia del pago para atender la cita'); return }
    setSaving(true)
    try {
      await panelTrabajadorService.atender(rid(reserva), { metodoPago: metodo, numeroOperacion: operacion, rutaImagenEvidencia: evidencia })
      toast.success('Cita atendida · venta enviada para aprobación'); onDone()
    } catch (e: any) { toast.error(mensajeError(e, 'No se pudo atender la cita')) } finally { setSaving(false) }
  }
  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
  return (
    <Shell title="Atender y registrar pago" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-3">{reserva.nombreClienteSnap || reserva.nombreCliente} · {soles(total)}</p>
      <div className="space-y-3">
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
        <button onClick={confirmar} disabled={saving || subiendo || !evidencia} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">
          {saving ? 'Procesando…' : 'Marcar como atendida'}
        </button>
      </div>
    </Shell>
  )
}

/* ---------- Modal Configuración (editar perfil del trabajador) ---------- */
function ConfigModal({ perfil, onClose, onSaved }: { perfil: MiPerfilTrabajador | null; onClose: () => void; onSaved: () => Promise<void> | void }) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [experiencia, setExperiencia] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [foto, setFoto] = useState<string>('')        // ruta cruda (lo que se guarda)
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!perfil) return
    setNombre(perfil.nombreCompleto || '')
    setCorreo(perfil.correo || '')
    setTelefono(perfil.telefono || '')
    setEspecialidad(perfil.especialidad || '')
    setExperiencia(perfil.experiencia || '')
    setDescripcion(perfil.descripcion || '')
    setFoto(perfil.urlFotoPerfil || '')
  }, [perfil])

  const subirFoto = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { const url = await panelTrabajadorService.subirEvidencia(file); setFoto(url); toast.success('Foto actualizada') }
    catch { toast.error('No se pudo subir la foto') } finally { setSubiendo(false) }
  }

  const guardar = async () => {
    if (!nombre.trim()) return toast.error('El nombre es obligatorio')
    if (telefono && !/^9\d{8}$/.test(telefono)) return toast.error('Teléfono peruano inválido (9 dígitos)')
    setSaving(true)
    try {
      await panelTrabajadorService.actualizarMiPerfil({
        nombreCompleto: nombre.trim(),
        correo: correo.trim() || undefined,
        telefono: telefono.trim() || undefined,
        especialidad: especialidad.trim() || undefined,
        experiencia: experiencia.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        urlFotoPerfil: foto || '',
      })
      const u = useAuthStore.getState().user
      if (u) useAuthStore.getState().setUser({ ...u, urlFotoPerfil: foto || null })
      toast.success('Perfil actualizado')
      await onSaved()
      onClose()
    } catch (e: any) { toast.error(mensajeError(e, 'No se pudo guardar')) } finally { setSaving(false) }
  }

  const darDeBaja = async () => {
    const ok = await confirmDialog({
      title: 'Dar de baja tu cuenta',
      message: 'Tu cuenta se desactivará y tu correo/teléfono quedarán libres para un registro futuro. Si tienes citas próximas o comisiones pendientes, igual se dará de baja. Conservamos tus datos por si necesitas soporte. ¿Quieres continuar?',
      confirmText: 'Sí, dar de baja',
      cancelText: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await panelTrabajadorService.darmeDeBaja()
      toast.success('Tu cuenta fue dada de baja.')
      useAuthStore.getState().logout()
      window.location.href = '/'
    } catch (e: any) { toast.error(mensajeError(e, 'No se pudo dar de baja la cuenta.')) }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
  const inicial = (nombre || 'B').trim().charAt(0).toUpperCase()
  return (
    <Shell title="Configuración · Mi perfil" onClose={onClose}>
      <p className="text-xs text-gray-500 -mt-1 mb-3">Estos datos son los que ven tus clientes y se sincronizan con tu cuenta de acceso.</p>
      <div className="space-y-3">
        {/* Foto */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
            {foto ? <img src={buildImageUrl(foto)} alt="Foto" className="w-full h-full object-cover" /> : <span className="text-white text-xl font-bold">{inicial}</span>}
          </div>
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Camera className="w-3.5 h-3.5" /> Foto de perfil</label>
            <input type="file" accept="image/*" onChange={subirFoto} className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:px-3 file:py-1.5 file:text-sm file:font-medium" />
            {subiendo && <p className="text-xs text-gray-400 mt-1">Subiendo…</p>}
          </div>
        </div>
        <div><label className="text-xs text-gray-500">Nombre completo</label><input className={field} value={nombre} onChange={e => setNombre(e.target.value)} /></div>
        <div><label className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Correo</label><input className={field} type="email" value={correo} onChange={e => setCorreo(e.target.value)} /></div>
        <div><label className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Teléfono</label><input className={field} value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="numeric" placeholder="9XXXXXXXX" /></div>
        <div><label className="text-xs text-gray-500">Especialidad</label><input className={field} value={especialidad} onChange={e => setEspecialidad(e.target.value)} placeholder="Ej. Fade, barba…" /></div>
        <div><label className="text-xs text-gray-500">Experiencia</label><input className={field} value={experiencia} onChange={e => setExperiencia(e.target.value)} placeholder="Ej. 3 años" /></div>
        <div><label className="text-xs text-gray-500">Descripción</label><textarea className={field} rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>
        {perfil?.porcentajeComision != null && <p className="text-xs text-gray-400">Tu comisión: <span className="font-semibold text-gray-600">{perfil.porcentajeComision}%</span> (la define el administrador)</p>}
        <button onClick={guardar} disabled={saving || subiendo} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button>

        <div className="pt-3 mt-1 border-t border-gray-100">
          <button onClick={darDeBaja} className="w-full text-sm text-rose-600 hover:text-rose-700 hover:underline py-1.5">
            Dar de baja mi cuenta
          </button>
        </div>
      </div>
    </Shell>
  )
}
