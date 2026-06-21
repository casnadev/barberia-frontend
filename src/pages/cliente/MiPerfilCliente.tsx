import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scissors, CalendarPlus, Phone, Mail, Star, Clock, CalendarCheck,
  History, MapPin, ChevronRight, X, Check, CalendarClock, Cake,
  Store, EyeOff, Eye, Bell, Gift, UserCog, Camera,
} from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import { useAuthStore } from '@/store/authStore'
import { reservasService, type ReservaResumen } from '@/services/reservasService'
import { miCuentaService, type MiPerfil } from '@/services/miCuentaService'
import { buildImageUrl } from '@/services/apiClient'
import { novedadesService, type Novedad } from '@/services/novedadesService'
import { AccountMenu } from '@/components/AccountMenu'
import { CompletaTuPerfil } from '@/components/CompletaTuPerfil'
import { Fab } from '@/components/Fab'
import { SlotPicker } from '@/components/SlotPicker'

/* ---------------- helpers ---------------- */
const ESTADO_STYLE: Record<string, string> = {
  Pendiente:  'bg-amber-50 text-amber-700 border-amber-200',
  Confirmada: 'bg-blue-50 text-blue-700 border-blue-200',
  Atendida:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelada:  'bg-rose-50 text-rose-600 border-rose-200',
  NoShow:     'bg-gray-100 text-gray-500 border-gray-200',
}
const ACTIVAS = new Set(['Pendiente', 'Confirmada'])
const TEL_DEFAULT = '900000000'
const MAIL_DEFAULT = 'noreply@barber.pe'

const AVATARS = [
  'from-blue-400 to-blue-600',
  'from-violet-400 to-fuchsia-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
]
const avatarKey = (id?: number) => `bp_avatar_${id}`
const hiddenKey = (id?: number) => `bp_hidden_${id}`
const readLS = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fallback } catch { return fallback }
}

const hoyISO = () => new Date().toISOString().slice(0, 10)
const fmtFecha = (iso?: string) => iso
  ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })
  : ''
const fmtHora = (h?: string) => (h || '').slice(0, 5)
const fmtSoles = (n?: number) => n == null ? '' : `S/ ${Number(n).toFixed(2)}`

const GENEROS = [
  { v: 'Masculino', l: 'Masculino' }, { v: 'Femenino', l: 'Femenino' },
  { v: 'Otro', l: 'Otro' }, { v: 'PrefieroNoDecir', l: 'Prefiero no decir' },
]

// Selectores de cumpleaños (más fáciles que el datepicker nativo).
const MESES_CUMPLE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const ANIOS_CUMPLE = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)

type Tab = 'citas' | 'historial' | 'novedades'

/* ============================================================ */
export function MiPerfilCliente() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user } = useAuthStore()
  const idCliente = user?.id

  const [perfil, setPerfil] = useState<MiPerfil | null>(null)
  const [reservas, setReservas] = useState<ReservaResumen[]>([])
  const [novedadesAdmin, setNovedadesAdmin] = useState<Novedad[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('citas')

  const [editOpen, setEditOpen] = useState(false)
  const [reprog, setReprog] = useState<ReservaResumen | null>(null)
  const [rate, setRate] = useState<ReservaResumen | null>(null)

  const [avatar, setAvatar] = useState(0)
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const [verOcultas, setVerOcultas] = useState(false)

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (params.get('config') === '1') { setEditOpen(true); params.delete('config'); setParams(params, { replace: true }) }
  }, [params])

  useEffect(() => {
    if (!idCliente) return
    setAvatar(readLS<number>(avatarKey(idCliente), idCliente % AVATARS.length))
    setHidden(new Set(readLS<number[]>(hiddenKey(idCliente), [])))
  }, [idCliente])

  const cargar = async () => {
    setLoading(true)
    try {
      const [p, r] = await Promise.all([
        idCliente ? miCuentaService.getMiPerfil(idCliente) : Promise.resolve(null),
        reservasService.getMisReservas(),
      ])
      setPerfil(p)
      setReservas(Array.isArray(r) ? r : [])
      // Novedades del negocio (no bloquean la carga si fallan)
      novedadesService.mias().then(setNovedadesAdmin).catch(() => setNovedadesAdmin([]))
    } catch { toast.error('No se pudo cargar tu cuenta') } finally { setLoading(false) }
  }

  const persistHidden = (next: Set<number>) => {
    setHidden(next)
    try { localStorage.setItem(hiddenKey(idCliente), JSON.stringify([...next])) } catch { /* noop */ }
  }
  const ocultar = (id: number) => { const n = new Set(hidden); n.add(id); persistHidden(n); toast.success('Cita oculta de tu historial') }
  const mostrar = (id: number) => { const n = new Set(hidden); n.delete(id); persistHidden(n) }
  const elegirAvatar = (i: number) => { setAvatar(i); try { localStorage.setItem(avatarKey(idCliente), JSON.stringify(i)) } catch { /* noop */ } }

  const { proximas, historial, ocultasCount } = useMemo(() => {
    const hoy = hoyISO()
    const asc = (a: ReservaResumen, b: ReservaResumen) => `${a.fechaReserva}${a.horaInicio}`.localeCompare(`${b.fechaReserva}${b.horaInicio}`)
    const desc = (a: ReservaResumen, b: ReservaResumen) => `${b.fechaReserva}${b.horaInicio}`.localeCompare(`${a.fechaReserva}${a.horaInicio}`)
    const prox = reservas.filter(r => ACTIVAS.has(r.estado) && (r.fechaReserva || '').slice(0, 10) >= hoy).sort(asc)
    const histAll = reservas.filter(r => !prox.includes(r)).sort(desc)
    const hist = histAll.filter(r => verOcultas || !hidden.has(r.idReserva))
    const ocultas = histAll.filter(r => hidden.has(r.idReserva)).length
    return { proximas: prox, historial: hist, ocultasCount: ocultas }
  }, [reservas, hidden, verOcultas])

  const atendidas = useMemo(() => reservas.filter(r => r.estado === 'Atendida').length, [reservas])
  const proxima = proximas[0]

  const telReal = perfil?.telefono && perfil.telefono !== TEL_DEFAULT
  const mailReal = perfil?.correo && perfil.correo !== MAIL_DEFAULT
  const incompleto = !loading && (!perfil?.nombreCompleto || !telReal || !mailReal || !perfil?.fechaNacimiento)

  /* ---- Novedades: feed derivado de tus datos (sin backend) ---- */
  const novedades = useMemo(() => {
    const list: { id: string; icon: any; tone: string; title: string; text: string; action?: () => void; cta?: string }[] = []
    if (incompleto) list.push({ id: 'perfil', icon: UserCog, tone: 'amber', title: 'Completa tu perfil', text: 'Agrega tu nombre, teléfono y cumpleaños para una mejor experiencia.', action: () => setEditOpen(true), cta: 'Completar' })
    if (proxima) list.push({ id: 'prox', icon: CalendarCheck, tone: 'blue', title: 'Tienes una cita próxima', text: `${proxima.nombreServicio} · ${fmtFecha(proxima.fechaReserva)} ${fmtHora(proxima.horaInicio)} · ${proxima.nombreSede}`, action: () => setTab('citas'), cta: 'Ver' })
    reservas.filter(r => r.estado === 'Atendida' && !r.yaCalificada).slice(0, 3).forEach(r =>
      list.push({ id: `cal-${r.idReserva}`, icon: Star, tone: 'emerald', title: '¿Cómo estuvo tu visita?', text: `Deja tu reseña de ${r.nombreServicio} con ${r.nombreTrabajador}.`, action: () => setRate(r), cta: 'Calificar' }))
    list.push({ id: 'promo', icon: Gift, tone: 'violet', title: '¡Gracias por elegir barber.pe! 🎉', text: 'Reserva en cualquiera de nuestras barberías y acumula tu historial en un solo lugar.' })
    return list
  }, [incompleto, proxima, reservas])

  /* ---------- acciones ---------- */
  const onConfirmar = async (r: ReservaResumen) => {
    if (!r.tokenCliente) return toast.error('No se puede confirmar esta cita')
    setBusy(r.idReserva)
    try { await reservasService.confirmarPorToken(r.tokenCliente); toast.success('Cita confirmada'); await cargar() }
    catch { toast.error('No se pudo confirmar') } finally { setBusy(null) }
  }
  const onCancelar = async (r: ReservaResumen) => {
    if (!r.tokenCliente) return toast.error('No se puede cancelar esta cita')
    if (!(await confirmDialog({
      title: 'Cancelar cita',
      message: '¿Seguro que deseas cancelar esta cita?',
      confirmText: 'Sí, cancelar',
      cancelText: 'Volver',
      tone: 'danger',
    }))) return
    setBusy(r.idReserva)
    try { await reservasService.cancelarPorToken(r.tokenCliente, 'Cancelada por el cliente'); toast.success('Cita cancelada'); await cargar() }
    catch { toast.error('No se pudo cancelar') } finally { setBusy(null) }
  }

  const TABS: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'citas', label: 'Citas', icon: CalendarCheck, badge: proximas.length || undefined },
    { key: 'historial', label: 'Historial', icon: History },
    { key: 'novedades', label: 'Novedades', icon: Bell, badge: (novedades.length + novedadesAdmin.length) || undefined },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center" aria-label="Ir al inicio">
            <img src="/barber-logo-black.png" alt="Barber.PE" className="h-7 w-auto" />
          </button>
          <AccountMenu variant="plain" siteLink />
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 py-6 pb-28 md:pb-10 grid lg:grid-cols-[360px_1fr] gap-6">
        {/* -------- Perfil (sin botón redundante de editar) -------- */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{perfil?.nombreCompleto || user?.nombreCompleto || 'Cliente'}</h2>
                <p className="text-sm text-gray-500">{atendidas > 0 ? `${atendidas} ${atendidas === 1 ? 'visita' : 'visitas'}` : 'Bienvenido de vuelta'}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {telReal ? perfil!.telefono : <span className="text-gray-400">Sin teléfono</span>}</div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {mailReal ? perfil!.correo : <span className="text-gray-400">Sin correo</span>}</div>
              <div className="flex items-center gap-2"><Cake className="w-4 h-4 text-gray-400" /> {perfil?.fechaNacimiento ? new Date(perfil.fechaNacimiento).toLocaleDateString('es-PE') : <span className="text-gray-400">Sin fecha</span>}</div>
            </div>
          </motion.div>

          {perfil && (
            <CompletaTuPerfil
              pasos={[
                { clave: 'nombre', etiqueta: 'Tu nombre', hecho: !!perfil.nombreCompleto },
                { clave: 'telefono', etiqueta: 'Tu teléfono', hecho: !!telReal },
                { clave: 'correo', etiqueta: 'Tu correo', hecho: !!mailReal },
                { clave: 'cumple', etiqueta: 'Tu cumpleaños', hecho: !!perfil.fechaNacimiento },
                { clave: 'genero', etiqueta: 'Tu género', hecho: !!perfil.genero },
              ]}
              onCompletar={() => setEditOpen(true)}
              nota="Con tu perfil completo reservas más rápido y recibes mejores recordatorios."
            />
          )}

          <button onClick={() => navigate('/reservar-publica')}
            className="hidden md:flex w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-4 items-center justify-center gap-2 font-semibold transition">
            <CalendarPlus className="w-5 h-5" /> Reservar una cita
          </button>
        </div>

        {/* -------- Contenido por tab -------- */}
        <div>
          {/* Tabs (desktop) */}
          <div className="hidden md:flex gap-1 mb-5 bg-white border border-gray-200 rounded-2xl p-1 w-fit">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
                {t.badge ? <span className={`text-[10px] rounded-full px-1.5 ${tab === t.key ? 'bg-white/25' : 'bg-blue-100 text-blue-700'}`}>{t.badge}</span> : null}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" /> Cargando tu cuenta...
            </div>
          ) : tab === 'citas' ? (
            <div className="space-y-5">
              {proxima && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-5">
                  <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">Tu próxima cita</p>
                  <p className="mt-1 text-xl font-bold">{proxima.nombreServicio}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-50">
                    <span className="inline-flex items-center gap-1.5"><CalendarCheck className="w-4 h-4" /> {fmtFecha(proxima.fechaReserva)}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {fmtHora(proxima.horaInicio)}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {proxima.nombreSede}</span>
                  </div>
                </motion.div>
              )}
              {proximas.length === 0 ? (
                <Empty icon={CalendarCheck} text="No tienes citas próximas." cta="Reservar una cita" onCta={() => navigate('/reservar-publica')} />
              ) : (
                <div className="space-y-3">
                  {proximas.map((r, i) => (
                    <CitaCard key={r.idReserva} r={r} index={i} onVerSede={() => r.idSede && navigate(`/sede/${r.idSede}`)}>
                      {r.estado === 'Pendiente' && <ActionBtn onClick={() => onConfirmar(r)} disabled={busy === r.idReserva} icon={<Check className="w-4 h-4" />} tone="emerald">Confirmar</ActionBtn>}
                      <ActionBtn onClick={() => setReprog(r)} disabled={busy === r.idReserva} icon={<CalendarClock className="w-4 h-4" />} tone="blue">Reprogramar</ActionBtn>
                      <ActionBtn onClick={() => onCancelar(r)} disabled={busy === r.idReserva} icon={<X className="w-4 h-4" />} tone="rose">Cancelar</ActionBtn>
                    </CitaCard>
                  ))}
                </div>
              )}
            </div>
          ) : tab === 'historial' ? (
            <div>
              {historial.length === 0 && ocultasCount === 0 ? (
                <Empty icon={History} text="Aún no tienes historial de visitas." />
              ) : (
                <>
                  {ocultasCount > 0 && (
                    <button onClick={() => setVerOcultas(v => !v)} className="mb-3 text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                      {verOcultas ? <><EyeOff className="w-3.5 h-3.5" /> Ocultar ocultas</> : <><Eye className="w-3.5 h-3.5" /> Ver ocultas ({ocultasCount})</>}
                    </button>
                  )}
                  <div className="space-y-3">
                    {historial.map((r, i) => (
                      <CitaCard key={r.idReserva} r={r} index={i} muted onVerSede={() => r.idSede && navigate(`/sede/${r.idSede}`)}>
                        {r.estado === 'Atendida' && (r.yaCalificada
                          ? <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {r.puntuacion}/5 · Calificada</span>
                          : <ActionBtn onClick={() => setRate(r)} icon={<Star className="w-4 h-4" />} tone="amber">Calificar</ActionBtn>)}
                        {hidden.has(r.idReserva)
                          ? <button onClick={() => mostrar(r.idReserva)} className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Mostrar</button>
                          : <button onClick={() => ocultar(r.idReserva)} className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Ocultar</button>}
                      </CitaCard>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* NOVEDADES */
            <div className="space-y-3">
              {(novedades.length === 0 && novedadesAdmin.length === 0) ? (
                <Empty icon={Bell} text="No tienes novedades por ahora." />
              ) : (
                <>
                  {/* Novedades publicadas por tus barberías */}
                  {novedadesAdmin.map((n, i) => (
                    <motion.div key={`adm-${n.idNovedad}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                      {n.urlImagen && <img src={buildImageUrl(n.urlImagen)} alt="" className="w-full max-h-52 object-cover" />}
                      <div className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                          <Gift className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{n.titulo}</p>
                          <p className="text-sm text-gray-500 whitespace-pre-line">{n.cuerpo}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Avisos derivados de tu actividad */}
                  {novedades.map((n, i) => (
                    <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        n.tone === 'amber' ? 'bg-amber-100 text-amber-600' : n.tone === 'blue' ? 'bg-blue-100 text-blue-600' :
                        n.tone === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
                        <n.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                        <p className="text-sm text-gray-500">{n.text}</p>
                      </div>
                      {n.action && n.cta && (
                        <button onClick={n.action} className="shrink-0 self-center text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-1">
                          {n.cta} <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB reservar (mobile) */}
      <Fab onClick={() => navigate('/reservar-publica')} label="Reservar cita" icon={CalendarPlus} />

      {/* Bottom bar = navegación de tabs (mobile), acciones únicas */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className={`relative flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[11px] ${tab === t.key ? 'text-blue-600' : 'text-gray-500'}`}>
            <t.icon className="w-5 h-5" />
            {t.badge ? <span className="absolute top-1.5 right-1/2 translate-x-4 bg-rose-500 text-white text-[9px] rounded-full px-1 leading-tight">{t.badge}</span> : null}
            {t.label}
          </button>
        ))}
      </nav>

      {/* Modales */}
      {editOpen && perfil && idCliente && (
        <EditarPerfilModal perfil={perfil} idCliente={idCliente} avatar={avatar} onAvatar={elegirAvatar}
          onClose={() => setEditOpen(false)} onSaved={async () => { setEditOpen(false); await cargar() }} />
      )}
      {reprog && <ReprogramarModal reserva={reprog} onClose={() => setReprog(null)} onDone={async () => { setReprog(null); await cargar() }} />}
      {rate && <CalificarModal reserva={rate} onClose={() => setRate(null)} onDone={async () => { setRate(null); await cargar() }} />}
    </div>
  )
}

/* ---------------- subcomponentes ---------------- */
function Empty({ icon: Icon, text, cta, onCta }: { icon: any; text: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
      <Icon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{text}</p>
      {cta && onCta && (
        <button onClick={onCta} className="mt-3 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold">
          <CalendarPlus className="w-4 h-4" /> {cta}
        </button>
      )}
    </div>
  )
}

function CitaCard({ r, index, muted, onVerSede, children }: { r: ReservaResumen; index: number; muted?: boolean; onVerSede?: () => void; children?: React.ReactNode }) {
  const foto = buildImageUrl(r.fotoTrabajador)
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className={`bg-white border border-gray-200 rounded-2xl p-4 ${muted ? 'opacity-90' : ''}`}>
      <div className="flex items-start gap-3">
        {foto ? <img src={foto} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
          : <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Scissors className="w-5 h-5 text-blue-600" /></div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 truncate">{r.nombreServicio || 'Servicio'}</p>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${ESTADO_STYLE[r.estado] || 'bg-gray-50 border-gray-200 text-gray-600'}`}>{r.estado}</span>
          </div>
          <p className="text-sm text-gray-500 truncate">con {r.nombreTrabajador || 'el profesional'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5"><CalendarCheck className="w-4 h-4 text-gray-400" /> {fmtFecha(r.fechaReserva)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> {fmtHora(r.horaInicio)}–{fmtHora(r.horaFin)}</span>
            {r.idSede ? (
              <button onClick={onVerSede} className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"><Store className="w-4 h-4" /> {r.nombreSede}</button>
            ) : (
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {r.nombreSede}</span>
            )}
            {r.precioServicio != null && <span className="font-semibold text-gray-800">{fmtSoles(r.precioServicio)}</span>}
          </div>
          {children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
        </div>
      </div>
    </motion.div>
  )
}

function ActionBtn({ children, onClick, disabled, icon, tone }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; icon: React.ReactNode; tone: 'emerald' | 'blue' | 'rose' | 'amber' }) {
  const tones = {
    emerald: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/30',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/30',
    rose: 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/30',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/30',
  }[tone]
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3.5 py-2 transition active:scale-95 disabled:opacity-50 ${tones}`}>
      {icon} {children}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

function EditarPerfilModal({ perfil, idCliente, avatar, onAvatar, onClose, onSaved }: { perfil: MiPerfil; idCliente: number; avatar: number; onAvatar: (i: number) => void; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(perfil.nombreCompleto || '')
  const [telefono, setTelefono] = useState(perfil.telefono && perfil.telefono !== TEL_DEFAULT ? perfil.telefono : '')
  const [correo, setCorreo] = useState(perfil.correo && perfil.correo !== MAIL_DEFAULT ? perfil.correo : '')
  const [fecha, setFecha] = useState(perfil.fechaNacimiento ? perfil.fechaNacimiento.slice(0, 10) : '')
  const [genero, setGenero] = useState(perfil.genero || '')
  const [foto, setFoto] = useState<string>(perfil.urlFotoPerfil || '')
  const [subiendo, setSubiendo] = useState(false)
  const [saving, setSaving] = useState(false)

  const subirFoto = async (e: any) => {
    const file = e.target.files?.[0]; if (!file) return
    setSubiendo(true)
    try { const url = await miCuentaService.subirFoto(file); setFoto(url); toast.success('Foto actualizada') }
    catch { toast.error('No se pudo subir la foto') } finally { setSubiendo(false) }
  }

  const guardar = async () => {
    if (telefono && !/^9\d{8}$/.test(telefono)) return toast.error('Teléfono peruano inválido (9 dígitos)')
    setSaving(true)
    try {
      await miCuentaService.actualizarMiPerfil(idCliente, { nombreCompleto: nombre, telefono, correo, fechaNacimiento: fecha || null, genero, urlFotoPerfil: foto })
      // Refresca el avatar del AccountMenu de inmediato (la foto subida manda).
      const au = useAuthStore.getState().user
      if (au) useAuthStore.getState().setUser({ ...au, urlFotoPerfil: foto || null })
      toast.success('Perfil actualizado'); onSaved()
    } catch (e: any) { toast.error(e?.response?.data?.mensaje || 'No se pudo guardar') } finally { setSaving(false) }
  }

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
  const inicial = (nombre || 'C').trim().charAt(0).toUpperCase()

  // Cumpleaños como día/mes/año (se recompone a YYYY-MM-DD para el backend).
  const [cy, cm, cd] = fecha ? fecha.split('-') : ['', '', '']
  const cumpDia = cd ? String(Number(cd)) : ''
  const cumpMes = cm ? String(Number(cm)) : ''
  const cumpAnio = cy || ''
  const maxDiaCumple = (cumpMes && cumpAnio) ? new Date(Number(cumpAnio), Number(cumpMes), 0).getDate() : 31
  const setCumple = (d: string, m: string, a: string) => {
    if (d && m && a) {
      const maxD = new Date(Number(a), Number(m), 0).getDate()
      const dd = String(Math.min(Number(d), maxD)).padStart(2, '0')
      setFecha(`${a}-${String(Number(m)).padStart(2, '0')}-${dd}`)
    } else {
      setFecha('')
    }
  }

  return (
    <Modal title="Editar mis datos" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500">Foto de perfil</label>
          <div className="flex items-center gap-3 mt-1">
            <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold shrink-0 ${foto ? '' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
              {foto ? <img src={buildImageUrl(foto)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : inicial}
            </div>
            <div className="space-y-1">
              <label className="inline-flex items-center gap-1 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 font-medium cursor-pointer">
                <Camera className="w-4 h-4" /> {subiendo ? 'Subiendo…' : 'Subir foto'}
                <input type="file" accept="image/*" onChange={subirFoto} className="hidden" disabled={subiendo} />
              </label>
              {foto && <button onClick={() => setFoto('')} className="block text-xs text-gray-400 hover:text-rose-500">Quitar foto</button>}
            </div>
          </div>
        </div>
        <div><label className="text-xs text-gray-500">Nombre completo</label><input className={field} value={nombre} onChange={e => setNombre(e.target.value)} /></div>
        <div><label className="text-xs text-gray-500">Teléfono</label><input className={field} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="9XXXXXXXX" inputMode="numeric" /></div>
        <div><label className="text-xs text-gray-500">Correo</label><input className={field} value={correo} onChange={e => setCorreo(e.target.value)} type="email" /></div>
        <div>
          <label className="text-xs text-gray-500">Cumpleaños</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <select className={field} value={cumpDia} onChange={e => setCumple(e.target.value, cumpMes, cumpAnio)}>
              <option value="">Día</option>
              {Array.from({ length: maxDiaCumple }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select className={field} value={cumpMes} onChange={e => setCumple(cumpDia, e.target.value, cumpAnio)}>
              <option value="">Mes</option>
              {MESES_CUMPLE.map((nm, i) => <option key={i} value={i + 1}>{nm}</option>)}
            </select>
            <select className={field} value={cumpAnio} onChange={e => setCumple(cumpDia, cumpMes, e.target.value)}>
              <option value="">Año</option>
              {ANIOS_CUMPLE.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div><label className="text-xs text-gray-500">Género</label>
          <select className={field} value={genero} onChange={e => setGenero(e.target.value)}>
            <option value="">—</option>{GENEROS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
          </select>
        </div>
        <button onClick={guardar} disabled={saving || subiendo} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </Modal>
  )
}

function ReprogramarModal({ reserva, onClose, onDone }: { reserva: ReservaResumen; onClose: () => void; onDone: () => void }) {
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [saving, setSaving] = useState(false)

  const confirmar = async () => {
    if (!fecha || !hora) return toast.error('Elige fecha y hora')
    if (!reserva.tokenCliente || !reserva.idTrabajador) return toast.error('No se puede reprogramar esta cita')
    setSaving(true)
    try {
      await reservasService.reprogramarPorToken(reserva.tokenCliente, { idTrabajador: reserva.idTrabajador, fechaReserva: fecha, horaInicio: hora })
      toast.success('Cita reprogramada'); onDone()
    } catch (e: any) { toast.error(e?.response?.data?.mensaje || 'No se pudo reprogramar') } finally { setSaving(false) }
  }

  return (
    <Modal title="Reprogramar cita" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">{reserva.nombreServicio} · con {reserva.nombreTrabajador} · {reserva.nombreSede}</p>
      {reserva.idTrabajador
        ? <SlotPicker idTrabajador={reserva.idTrabajador} idServicio={reserva.idServicio} fecha={fecha} hora={hora} onSelectFecha={setFecha} onSelectHora={setHora} />
        : <p className="text-sm text-gray-400">No se puede reprogramar esta cita.</p>}
      <button onClick={confirmar} disabled={saving || !fecha || !hora}
        className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">
        {saving ? 'Reprogramando…' : 'Confirmar nuevo horario'}
      </button>
    </Modal>
  )
}

function CalificarModal({ reserva, onClose, onDone }: { reserva: ReservaResumen; onClose: () => void; onDone: () => void }) {
  const [pts, setPts] = useState(0)
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)

  const enviar = async () => {
    if (pts === 0) return toast.error('Selecciona una puntuación')
    setSaving(true)
    try {
      await miCuentaService.crearCalificacion(reserva.idReserva, pts, comentario)
      toast.success('¡Gracias por tu calificación!'); onDone()
    } catch (e: any) {
      if (e?.response?.status === 409) { toast.error('Esta cita ya fue calificada'); onDone() }
      else toast.error(e?.response?.data?.mensaje || 'No se pudo calificar')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Calificar atención" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-3">{reserva.nombreServicio} · con {reserva.nombreTrabajador}</p>
      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setPts(n)}><Star className={`w-9 h-9 ${n <= pts ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} /></button>
        ))}
      </div>
      <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        rows={3} maxLength={500} placeholder="Comentario (opcional)" value={comentario} onChange={e => setComentario(e.target.value)} />
      <button onClick={enviar} disabled={saving} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">{saving ? 'Enviando…' : 'Enviar calificación'}</button>
    </Modal>
  )
}
