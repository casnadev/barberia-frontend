import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Fab } from '@/components/Fab'
import { AgendaBoard, type TrabajadorPropio } from '@/components/AgendaBoard'
import {
  Scissors, CalendarCheck, Check, X, DollarSign, Star, Wallet, Camera,
  CalendarDays, CalendarOff, Plus, Trash2, Mail, Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import { useAuthStore } from '@/store/authStore'
import { reservasService } from '@/services/reservasService'
import { mensajeError } from '@/utils/apiError'
import {
  panelTrabajadorService,
  type MisComisiones, type PagoTrabajador, type ResenaTrabajador,
  type DisponibilidadDia, type DescansoTrabajador, type MiPerfilTrabajador,
} from '@/services/panelTrabajadorService'
import { AccountMenu } from '@/components/AccountMenu'
import { buildImageUrl } from '@/services/apiClient'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const METODOS = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia', 'Otro']
const TIPOS_DESCANSO = ['Vacaciones', 'Permiso', 'Médico', 'Personal', 'Otro']
const hoyISO = () => new Date().toISOString().slice(0, 10)
const soles = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`
const rid = (r: any) => r.idReserva ?? r.id
const fmtDia = (iso?: string) => iso
  ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  : ''

type Tab = 'agenda' | 'disponibilidad' | 'comisiones' | 'resenas'

export function TrabajadorMiAgenda() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('agenda')
  const [idT, setIdT] = useState<number | null>(null)
  const [idSede, setIdSede] = useState<number | null>(null)
  const [perfil, setPerfil] = useState<MiPerfilTrabajador | null>(null)
  const [comisiones, setComisiones] = useState<MisComisiones | null>(null)
  const [reservas, setReservas] = useState<any[]>([])
  const [nombre, setNombre] = useState<string | undefined>(undefined)
  const [foto, setFoto] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [atender, setAtender] = useState<any | null>(null)

  const showConfig = params.get('config') === '1'
  const cerrarConfig = () => { params.delete('config'); setParams(params, { replace: true }) }

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
    { key: 'agenda', label: 'Agenda', icon: CalendarCheck },
    { key: 'disponibilidad', label: 'Horario', icon: CalendarDays },
    { key: 'comisiones', label: 'Comisiones', icon: DollarSign },
    { key: 'resenas', label: 'Reseñas', icon: Star },
  ]

  const irReservar = () => navigate('/reservar-publica')

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header limpio: marca + cuenta */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="mx-auto max-w-[1380px] px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center"><Scissors className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">{nombre || user?.nombreCompleto || 'Mi agenda'}</h1>
              <p className="text-xs text-gray-500">Barbero</p>
            </div>
          </div>
          <AccountMenu variant="plain" siteLink />
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 py-6 pb-28 md:pb-10">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Kpi icon={CalendarCheck} tone="blue" label="Citas hoy" value={String(hoyCount)} />
          <Kpi icon={Check} tone="emerald" label="Atendidas hoy" value={String(atendidasHoy)} />
          <Kpi icon={Wallet} tone="violet" label="Comisión pendiente" value={soles(comisiones?.comisionesTotalPendiente)} />
          <Kpi icon={DollarSign} tone="amber" label="Comisión pagada" value={soles(comisiones?.comisionesTotalPagado)} />
        </div>

        {/* Tabs desktop + botón Reservar */}
        <div className="hidden md:flex items-center justify-between gap-3 mb-5">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 w-fit">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
          <button onClick={irReservar}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm shadow-blue-600/20 active:scale-95 transition">
            <Plus className="w-4 h-4" /> Reservar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" /> Cargando…</div>
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

      {/* Bottom bar mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] ${tab === t.key ? 'text-blue-600' : 'text-gray-500'}`}>
            <t.icon className="w-5 h-5" /> {t.label}
          </button>
        ))}
      </nav>

      {atender && <AtenderModal reserva={atender} onClose={() => setAtender(null)} onDone={async () => { setAtender(null); await cargar() }} />}

      {showConfig && <ConfigModal perfil={perfil} onClose={cerrarConfig} onSaved={async () => { await cargar() }} />}

      {/* FAB (móvil): reservar desde cualquier pestaña */}
      <Fab onClick={irReservar} label="Reservar" />
    </div>
  )
}

/* ---------- KPI ---------- */
function Kpi({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: string }) {
  const t = { blue: 'bg-blue-100 text-blue-600', emerald: 'bg-emerald-100 text-emerald-600', violet: 'bg-violet-100 text-violet-600', amber: 'bg-amber-100 text-amber-600' }[tone] || 'bg-gray-100 text-gray-600'
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${t}`}><Icon className="w-5 h-5" /></div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
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
        <div className="space-y-2">
          {DIAS.map((nombre, i) => {
            const s = sede[i]
            const cerrado = !s
            return (
              <div key={i} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${cerrado ? 'border-gray-100 bg-gray-50 opacity-60' : dias[i].activo ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200'}`}>
                <label className="flex items-center gap-2 w-32 cursor-pointer">
                  <input type="checkbox" disabled={cerrado} checked={dias[i].activo} onChange={e => setDias(d => d.map((x, j) => j === i ? { ...x, activo: e.target.checked, horaInicio: e.target.checked && s ? s.ini : x.horaInicio, horaFin: e.target.checked && s ? s.fin : x.horaFin } : x))} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{nombre}</span>
                </label>
                {cerrado ? (
                  <span className="text-xs text-gray-400">Sede cerrada</span>
                ) : (
                  <>
                    <input type="time" min={s.ini} max={s.fin} disabled={!dias[i].activo} value={dias[i].horaInicio} onChange={e => setDias(d => d.map((x, j) => j === i ? { ...x, horaInicio: e.target.value } : x))} className="border border-gray-200 rounded-lg px-2 py-1 text-sm disabled:opacity-40" />
                    <span className="text-gray-400">a</span>
                    <input type="time" min={s.ini} max={s.fin} disabled={!dias[i].activo} value={dias[i].horaFin} onChange={e => setDias(d => d.map((x, j) => j === i ? { ...x, horaFin: e.target.value } : x))} className="border border-gray-200 rounded-lg px-2 py-1 text-sm disabled:opacity-40" />
                    <span className="text-[11px] text-gray-400">Sede: {s.ini}–{s.fin}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <button onClick={guardar} disabled={saving} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 font-semibold disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar horario'}</button>
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
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 max-w-2xl">
      <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><CalendarOff className="w-5 h-5 text-gray-500" /> No disponibilidad</h3>
      <p className="text-sm text-gray-500 mb-4">Solicita días libres (vacaciones, permiso, etc.). Esto <b>no borra</b> tu horario semanal; solo bloquea esas fechas una vez que el administrador lo apruebe.</p>

      {/* Formulario */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select className={field} value={tipo} onChange={e => setTipo(e.target.value)}>{TIPOS_DESCANSO.map(t => <option key={t} value={t}>{t}</option>)}</select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" className={field} value={ini} min={hoyISO()} onChange={e => setIni(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" className={field} value={fin} min={ini || hoyISO()} onChange={e => setFin(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">Motivo (opcional)</label>
          <input className={`${field} w-full`} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. viaje familiar" />
        </div>
        <button onClick={solicitar} disabled={saving} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
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
    </div>
  )
}

/* ---------- Comisiones ---------- */
function ComisionesTab({ idT, comisiones }: { idT: number | null; comisiones: MisComisiones | null }) {
  const [pagos, setPagos] = useState<PagoTrabajador[]>([])
  useEffect(() => { if (idT) panelTrabajadorService.getMisPagos(idT).then(setPagos) }, [idT])
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4"><p className="text-xs text-gray-500">Ganado (total)</p><p className="text-xl font-bold text-gray-900">{soles(comisiones?.comisionesTotalCalculado)}</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><p className="text-xs text-amber-700">Pendiente de pago</p><p className="text-xl font-bold text-amber-700">{soles(comisiones?.comisionesTotalPendiente)}</p></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4"><p className="text-xs text-emerald-700">Pagado</p><p className="text-xl font-bold text-emerald-700">{soles(comisiones?.comisionesTotalPagado)}</p></div>
      </div>
      <section>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Wallet className="w-5 h-5 text-gray-500" /> Historial de pagos</h3>
        {pagos.length === 0 ? <p className="text-sm text-gray-400 bg-white border border-dashed border-gray-300 rounded-2xl p-6 text-center">Aún no tienes pagos registrados.</p>
          : <div className="space-y-2">{pagos.map(p => (
            <div key={p.idPago} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{soles(p.montoPagado)} <span className="text-xs font-normal text-gray-500">· {p.metodoPago}</span></p>
                <p className="text-xs text-gray-500">{new Date(p.fechaPago).toLocaleDateString('es-PE')} · por {p.nombreUsuarioRegistra}</p>
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
            <p className="text-xs text-gray-400 mt-1">{new Date(r.fechaCreacion).toLocaleDateString('es-PE')}</p>
          </div>
        ))}</div>}
    </div>
  )
}

/* ---------- Modal Atender (+ evidencia) ---------- */
function Shell({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
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
    setSaving(true)
    try {
      await panelTrabajadorService.atender(rid(reserva), { metodoPago: metodo, numeroOperacion: operacion, rutaImagenEvidencia: evidencia })
      toast.success('Cita atendida · venta y comisión generadas'); onDone()
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
          <label className="text-xs text-gray-500 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Evidencia del pago (opcional)</label>
          <input type="file" accept="image/*" onChange={subir} className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:px-3 file:py-1.5 file:text-sm file:font-medium" />
          {subiendo && <p className="text-xs text-gray-400 mt-1">Subiendo…</p>}
          {evidencia && <img src={evidencia} alt="evidencia" className="mt-2 rounded-lg max-h-32 border border-gray-200" />}
        </div>
        <button onClick={confirmar} disabled={saving || subiendo} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 font-semibold disabled:opacity-50">
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
      </div>
    </Shell>
  )
}
