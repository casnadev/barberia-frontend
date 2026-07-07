import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import {
  Scissors, Plus, Building2, MapPin, KeyRound, Power,
  X, Check, Mail, Phone, CreditCard,
  Store, Trash2, Loader2, Pencil, RefreshCw,
  Search, ExternalLink, MoreHorizontal, CalendarDays, User,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { AccountMenu } from '@/components/AccountMenu'
import { DirectorioPanel } from '@/components/DirectorioPanel'
import { LandingPanel } from '@/components/LandingPanel'
import { ReferidosPanel } from '@/components/ReferidosPanel'
import { SuperAdminBillingPanel } from '@/components/SuperAdminBillingPanel'
import { SuperAdminPlanesPanel } from '@/components/SuperAdminPlanesPanel'
import { directorioService } from '@/services/directorioService'
import {
  empresasService, type Empresa, type Admin, type Plan,
  type SedeAdmin, type CanalAcceso,
} from '@/services/empresasService'

/** Texto → slug válido para subdominio/slug (^[a-z0-9-]{3,}$). */
const slugify = (t: string): string =>
  (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '')

const soles = (n: number) => n === 0 ? 'Gratis' : `S/ ${n.toFixed(0)}`

const fechaCorta = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Fecha de alta legible ("3 jul 2026").
const fechaAlta = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Iniciales para el avatar de marca (1-2 letras).
const iniciales = (nombre: string) => {
  const p = (nombre || '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  return (p[0][0] + (p[1]?.[0] ?? '')).toUpperCase()
}

// Hex válido → se usa como color de marca; si no, un neutro.
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const colorMarca = (hex?: string | null) => (hex && HEX_RE.test(hex.trim()) ? hex.trim() : '#111827')

// URL pública del sitio de la barbería = raíz de marca (slug del nombre comercial),
// nunca el subdominio de sede.
const urlSitio = (nombreComercial?: string | null) =>
  nombreComercial ? `https://${slugify(nombreComercial)}.barber.pe` : null

type CrearForm = {
  nombre: string
  ownerNombre: string
  canal: CanalAcceso
  ownerCorreo: string
  ownerTelefono: string
}
const emptyForm: CrearForm = { nombre: '', ownerNombre: '', canal: 'Email', ownerCorreo: '', ownerTelefono: '' }

export function SuperAdminDashboard() {
  const { user } = useAuthStore()

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [seccion, setSeccion] = useState<'barberias' | 'directorio' | 'landing' | 'referidos' | 'billing' | 'planes'>('barberias')
  const [owners, setOwners] = useState<Record<number, Admin | null>>({})
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  // Alta (un solo paso, datos mínimos)
  const [crearOpen, setCrearOpen] = useState(false)
  const [form, setForm] = useState<CrearForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Modales auxiliares
  const [planTarget, setPlanTarget] = useState<Empresa | null>(null)
  const [sedeTarget, setSedeTarget] = useState<Empresa | null>(null)
  const [duenoTarget, setDuenoTarget] = useState<Empresa | null>(null)
  const [accionesTarget, setAccionesTarget] = useState<Empresa | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [rango, setRango] = useState<'todas' | 'hoy' | 'semana' | 'mes'>('todas')

  // silent = revalidación en segundo plano SIN blanquear la pantalla (no toca
  // `loading`). Se usa al cerrar modales: si hubo cambios refrescamos los datos
  // en sitio, sin el skeleton de carga inicial que hacía "parpadear" el panel.
  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [emps, pls] = await Promise.all([
        empresasService.getEmpresas(),
        empresasService.getPlanes().catch(() => []),
      ])
      setEmpresas(emps)
      setPlanes(pls)
      // El dueño ya viene incrustado en cada empresa (backend), así que NO
      // hacemos una llamada por barbería. Esto elimina el N+1 (y sus preflights).
      const map: Record<number, Admin | null> = {}
      for (const e of emps) map[e.id] = e.owner ?? null
      setOwners(map)
    } catch {
      toast.error('No se pudieron cargar las barberías.')
    } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])  // primera carga: con skeleton

  const stats = useMemo(() => {
    const total = empresas.length
    const activas = empresas.filter((e) => !e.pausada).length
    const sinAcceso = empresas.filter((e) => owners[e.id] == null).length
    return { total, activas, sinAcceso }
  }, [empresas, owners])

  // Vista: filtra por búsqueda y rango de fecha de alta; ordena por más recientes.
  const empresasVista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const now = new Date()
    const startHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startSemana = new Date(startHoy); startSemana.setDate(startHoy.getDate() - ((now.getDay() + 6) % 7))
    const startMes = new Date(now.getFullYear(), now.getMonth(), 1)
    const desde = rango === 'hoy' ? startHoy : rango === 'semana' ? startSemana : rango === 'mes' ? startMes : null
    return empresas
      .filter((e) => {
        if (q) {
          const hay = `${e.nombreComercial} ${e.razonSocial} ${e.subdominioPrincipal ?? ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        if (desde && e.fechaCreacion && new Date(e.fechaCreacion) < desde) return false
        return true
      })
      .sort((a, b) => (b.fechaCreacion ? Date.parse(b.fechaCreacion) : 0) - (a.fechaCreacion ? Date.parse(a.fechaCreacion) : 0))
  }, [empresas, busqueda, rango])

  // ----------------------------------------------------------------- Alta mínima
  const abrirCrear = () => { setForm(emptyForm); setCrearOpen(true) }

  const emailOk = /\S+@\S+\.\S+/.test(form.ownerCorreo.trim())
  const telOk = /^9\d{8}$/.test(form.ownerTelefono.trim())
  const valido = form.nombre.trim().length >= 2 && (form.canal === 'Email' ? emailOk : telOk)
  const subPreview = slugify(form.nombre) || 'tu-negocio'

  const crearTodo = async () => {
    if (!valido) return
    setSaving(true)
    try {
      const nombre = form.nombre.trim()
      // Alta ATÓMICA (un solo endpoint): Empresa + Admin + sede inicial + plan Prueba + OTP.
      const res = await directorioService.altaRapida({
        nombreNegocio: nombre,
        correo: form.canal === 'Email' ? form.ownerCorreo.trim() : undefined,
        telefono: form.canal === 'WhatsApp' ? form.ownerTelefono.trim() : undefined,
        nombreContacto: form.ownerNombre.trim() || undefined,
      })
      toast.success(`"${nombre}" creada.${res.otpEnviado ? ' Le enviamos un código de acceso.' : ''}`)
      setCrearOpen(false)
      await loadAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo crear la barbería.')
    } finally { setSaving(false) }
  }

  // ----------------------------------------------------------------- Acciones tarjeta
  const toggleAccesoAdmin = async (e: Empresa) => {
    const owner = owners[e.id]
    if (!owner) { toast.error('Esta barbería no tiene dueño asignado.'); return }
    const habilitado = owner.estado === false ? true : false   // si está apagado → prender; si no → apagar
    setOwners((m) => ({ ...m, [e.id]: { ...owner, estado: habilitado } }))
    try {
      await empresasService.setUsuarioEstado(owner.id, habilitado)
      toast.success(habilitado ? 'Acceso del Admin habilitado.' : 'Acceso del Admin deshabilitado.')
    } catch (err: any) {
      setOwners((m) => ({ ...m, [e.id]: { ...owner, estado: !habilitado } }))
      toast.error(err?.response?.data?.message || 'No se pudo cambiar el acceso.')
    }
  }

  const toggleEstado = async (e: Empresa) => {
    const activar = e.pausada === true   // si está pausada → reactivar; si no → pausar
    try {
      await empresasService.setEmpresaEstado(e.id, activar)
      setEmpresas((list) => list.map((x) => (x.id === e.id ? { ...x, pausada: !activar } : x)))
      toast.success(activar ? 'Barbería reactivada.' : 'Barbería pausada.')
    } catch { toast.error('No se pudo cambiar el estado.') }
  }

  // Override manual del límite de sedes (Bloque A). valor: N (tope), -1 (∞), null (usar plan).
  const setLimite = async (e: Empresa, valor: number | null) => {
    if (e.limiteSedesOverride === valor) return
    try {
      await empresasService.setLimiteSedesOverride(e.id, valor)
      setEmpresas((list) => list.map((x) => (x.id === e.id ? { ...x, limiteSedesOverride: valor } : x)))
      toast.success(
        valor === null ? 'Límite: ahora manda el plan.'
          : valor < 0 ? 'Sedes: ilimitadas.'
          : `Sedes permitidas: ${valor}.`,
      )
    } catch { toast.error('No se pudo actualizar el límite.') }
  }

  const eliminarEmpresa = async (e: Empresa) => {
    const owner = owners[e.id]
    const vacia = (e.totalSedes ?? 0) === 0 && !owner
    const ok = await confirmDialog({
      title: vacia ? 'Eliminar barbería vacía' : 'Eliminar barbería',
      message: vacia
        ? `"${e.nombreComercial}" no tiene sedes ni accesos. Se eliminará definitivamente. ¿Continuar?`
        : `Se archivará "${e.nombreComercial}": se ocultarán sus sedes y accesos, se cerrarán sus sesiones y sus subdominios quedarán libres. Los datos se conservan. ¿Continuar?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      tone: 'danger',
    })
    if (!ok) return
    try {
      const res = await empresasService.deleteEmpresa(e.id)
      toast.success(res?.mensaje || res?.message || 'Barbería eliminada.')
      await loadAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.mensaje || err?.response?.data?.message || 'No se pudo eliminar la barbería.')
    }
  }

  const asignarPlan = async (idPlan: number) => {
    if (!planTarget) return
    try {
      const plan = planes.find((p) => p.idPlan === idPlan)!
      let fechaFin: string | null = null
      if (plan.precioMensualPEN === 0) {
        const d = new Date(); d.setDate(d.getDate() + 14); fechaFin = d.toISOString().slice(0, 10)
      }
      await empresasService.asignarSuscripcion(planTarget.id, idPlan, fechaFin)
      toast.success(`Plan ${plan.nombre} activado para ${planTarget.nombreComercial}.`)
      setPlanTarget(null)
      await loadAll() // refresca el plan visible en la tarjeta
    } catch { toast.error('No se pudo asignar el plan.') }
  }

  // ================================================================= UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1380px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <img src="/barber-logo-black.png" alt="Barber.PE" className="h-6" />
              <p className="text-xs text-gray-500 -mt-0.5">Panel maestro</p>
            </div>
          </div>
          <AccountMenu variant="plain" />
        </div>
      </header>

      <main className="max-w-[1380px] mx-auto px-4 py-7">
        {/* Selector de sección: Barberías | Directorio */}
        <div className="flex flex-wrap items-center gap-1 p-1 mb-6 bg-white border border-gray-200 rounded-xl">
          <button onClick={() => setSeccion('barberias')}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap ${
              seccion === 'barberias' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Barberías
          </button>
          <button onClick={() => setSeccion('directorio')}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap ${
              seccion === 'directorio' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Directorio
          </button>
          <button onClick={() => setSeccion('landing')}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap ${
              seccion === 'landing' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Landing
          </button>
          <button onClick={() => setSeccion('referidos')}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap ${
              seccion === 'referidos' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Referidos
          </button>
          <button onClick={() => setSeccion('billing')}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap ${
              seccion === 'billing' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Facturación
          </button>
          <button onClick={() => setSeccion('planes')}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap ${
              seccion === 'planes' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Planes
          </button>
        </div>

        {seccion === 'directorio' && <DirectorioPanel />}

        {seccion === 'landing' && <LandingPanel />}

        {seccion === 'referidos' && <ReferidosPanel />}

        {seccion === 'billing' && <SuperAdminBillingPanel />}

        {seccion === 'planes' && <SuperAdminPlanesPanel />}

        {seccion === 'barberias' && (<>
        {/* Stats + acción */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="grid grid-cols-3 gap-2.5 flex-1 max-w-md">
            {[
              { label: 'Barberías', value: stats.total, icon: Building2 },
              { label: 'Activas', value: stats.activas, icon: Power },
              { label: 'Sin dueño', value: stats.sinAcceso, icon: KeyRound },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 flex flex-col items-center sm:items-start text-center sm:text-left">
                <s.icon className="w-4 h-4 text-blue-600 mb-1.5" />
                <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          <button onClick={abrirCrear}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition">
            <Plus className="w-5 h-5" /> Nueva barbería
          </button>
        </div>

        {/* Filtro por fecha de alta + búsqueda */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="inline-flex bg-gray-100 rounded-xl p-1 self-start">
            {([['todas', 'Todas'], ['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setRango(k)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                  rango === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar barbería"
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : empresas.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>Aún no hay barberías. Crea la primera.</p>
          </div>
        ) : empresasVista.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Search className="w-9 h-9 mx-auto mb-3 text-gray-300" />
            <p>Sin resultados para tu búsqueda o filtro.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {empresasVista.map((e) => {
              const owner = owners[e.id]
              const inactivo = e.pausada === true
              const esPrueba = (e.planActual || '').toLowerCase().includes('prueba')
              const marca = colorMarca(e.colorPrimarioHex)
              const sitio = e.subdominioPrincipal ? urlSitio(e.nombreComercial) : null
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-white border rounded-2xl p-4 ${inactivo ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                  {/* Encabezado: avatar de marca + nombre/subdominio + estado */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ background: marca }}>
                      {iniciales(e.nombreComercial)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{e.nombreComercial}</h3>
                      <p className="text-xs text-gray-400 truncate">{e.subdominioPrincipal ? `${slugify(e.nombreComercial)}.barber.pe` : e.razonSocial}</p>
                    </div>
                    {inactivo
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">Inactiva</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 shrink-0">Activa</span>}
                  </div>

                  {/* Meta: plan + sedes + fecha de alta */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {e.planActual ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        esPrueba ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        <CreditCard className="w-3.5 h-3.5" />
                        {e.planActual}
                        {e.fechaFinPlan && <span className="text-gray-400 font-normal">· vence {fechaCorta(e.fechaFinPlan)}</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                        <CreditCard className="w-3.5 h-3.5" /> Sin plan
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 px-2 py-0.5 rounded-full bg-gray-50">
                      <MapPin className="w-3.5 h-3.5" /> {e.totalSedes ?? 0} {(e.totalSedes ?? 0) === 1 ? 'sede' : 'sedes'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 px-2 py-0.5 rounded-full bg-gray-50">
                      <CalendarDays className="w-3.5 h-3.5" /> Alta {fechaAlta(e.fechaCreacion)}
                    </span>
                    {!owner && <span className="text-xs text-red-500">Sin dueño</span>}
                  </div>

                  {/* Acciones: Ver sitio + menú */}
                  <div className="mt-4 flex items-center gap-2">
                    <a href={sitio ?? undefined} target="_blank" rel="noopener noreferrer"
                      onClick={(ev) => { if (!sitio) ev.preventDefault() }}
                      className={`inline-flex items-center justify-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition flex-1 ${
                        sitio ? 'bg-gray-50 text-gray-700 hover:bg-gray-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
                      <ExternalLink className="w-4 h-4" /> Ver sitio
                    </a>
                    <button onClick={() => setAccionesTarget(e)} aria-label="Más acciones"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
        </>)}
      </main>

      {/* ============================== ALTA MÍNIMA ============================== */}
      <AnimatePresence>
        {crearOpen && (
          <Modal onClose={() => !saving && setCrearOpen(false)}>
            <h2 className="text-lg font-semibold text-gray-900">Nueva barbería</h2>
            <p className="text-sm text-gray-500 mt-0.5 mb-4">
              Solo lo mínimo. El dueño completará el resto desde su perfil.
            </p>

            <div className="space-y-4">
              <Field label="Nombre del negocio *">
                <input className={inputCls} value={form.nombre} autoFocus
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                <p className="text-xs text-gray-400 mt-1">
                  Su página será <span className="font-medium text-gray-600">{subPreview}.barber.pe</span>
                </p>
              </Field>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">¿Cómo recibirá su acceso?</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Email', 'WhatsApp'] as CanalAcceso[]).map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, canal: c })}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition inline-flex items-center justify-center gap-2 ${
                        form.canal === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                      {c === 'Email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      {c === 'Email' ? 'Correo' : 'WhatsApp'}
                    </button>
                  ))}
                </div>
              </div>

              {form.canal === 'Email' ? (
                <Field label="Correo del dueño *">
                  <input className={inputCls} value={form.ownerCorreo} autoCapitalize="none" inputMode="email"
                    onChange={(e) => setForm({ ...form, ownerCorreo: e.target.value })} />
                  {form.ownerCorreo.trim() && !emailOk &&
                    <p className="text-xs text-red-500 mt-1">Correo inválido.</p>}
                </Field>
              ) : (
                <Field label="WhatsApp del dueño *">
                  <input className={inputCls} value={form.ownerTelefono} inputMode="numeric"
                    onChange={(e) => setForm({ ...form, ownerTelefono: e.target.value })} />
                  {form.ownerTelefono.trim() && !telOk &&
                    <p className="text-xs text-red-500 mt-1">Debe ser un celular peruano: 9 dígitos que empiezan en 9.</p>}
                </Field>
              )}

              <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Se crea con el plan <strong>Prueba</strong> (14 días) y una <strong>sede inicial</strong>. La dirección pública (negocio.barber.pe) se genera del nombre.</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button type="button" disabled={saving} onClick={() => setCrearOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-800">
                Cancelar
              </button>
              <button type="button" disabled={!valido || saving} onClick={crearTodo}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Creando...' : 'Crear y dar acceso'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ============================== PLAN ============================== */}
      <AnimatePresence>
        {planTarget && (
          <Modal onClose={() => setPlanTarget(null)}>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Plan de {planTarget.nombreComercial}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {planTarget.planActual
                ? <>Plan actual: <strong className="text-gray-700">{planTarget.planActual}</strong>. Elige otro para cambiarlo.</>
                : 'Esta barbería no tiene plan. Elige uno para activarlo.'}
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {planes.map((p) => {
                const actual = (planTarget.planActual || '') === p.nombre
                return (
                  <button key={p.idPlan} type="button" onClick={() => asignarPlan(p.idPlan)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      actual ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 inline-flex items-center gap-2">
                        {p.nombre}
                        {actual && <span className="text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded-full px-2 py-0.5">Actual</span>}
                      </span>
                      <span className="font-bold text-blue-700">{soles(p.precioMensualPEN)}<span className="text-xs font-normal text-gray-400">/mes</span></span>
                    </div>
                    {p.descripcion && <p className="text-xs text-gray-500 mt-1">{p.descripcion}</p>}
                  </button>
                )
              })}
              {planes.length === 0 && <p className="text-sm text-gray-400">No hay planes. Corre el SQL de planes.</p>}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ============================== SEDES ============================== */}
      <AnimatePresence>
        {sedeTarget && (
          <SedesModal empresa={sedeTarget} onLimite={(v) => setLimite(sedeTarget, v)}
            onClose={(changed?: boolean) => { setSedeTarget(null); if (changed) loadAll(true) }} />
        )}
      </AnimatePresence>

      {/* ============================== DUEÑO ============================== */}
      <AnimatePresence>
        {duenoTarget && (() => {
          const o = owners[duenoTarget.id]
          return (
            <Modal onClose={() => setDuenoTarget(null)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-lg shrink-0">
                  {iniciales(o?.nombreCompleto || duenoTarget.nombreComercial)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Dueño</h3>
                  <p className="text-sm text-gray-500 truncate">{duenoTarget.nombreComercial}</p>
                </div>
              </div>
              {o ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-3">
                    <p className="font-semibold text-gray-900">{o.nombreCompleto}</p>
                    <p className="text-xs text-indigo-600 font-medium">{o.metodoLogin === 'Password' ? 'Ingresa con contraseña' : 'Ingresa con PIN / OTP'}</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                    <span className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></span>
                    <span className={`text-sm truncate ${o.correo ? 'text-gray-800' : 'text-gray-400'}`}>{o.correo || 'Sin correo'}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                    <span className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></span>
                    <span className={`text-sm truncate ${o.telefono ? 'text-gray-800' : 'text-gray-400'}`}>{o.telefono || 'Sin teléfono'}</span>
                  </div>
                  <div className={`flex items-center justify-between rounded-xl p-3 border ${
                    o.estado === false ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'}`}>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className={`w-2 h-2 rounded-full ${o.estado === false ? 'bg-gray-400' : 'bg-green-500'}`} />
                      Acceso {o.estado === false ? 'apagado' : 'activo'}
                    </span>
                    <button onClick={() => toggleAccesoAdmin(duenoTarget)}
                      className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                        o.estado === false ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
                      <KeyRound className="w-4 h-4" /> {o.estado === false ? 'Activar' : 'Apagar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 text-center">
                  Esta barbería no tiene dueño asignado.
                </div>
              )}
            </Modal>
          )
        })()}
      </AnimatePresence>

      {/* ====================== ACCIONES DE LA CARD (action sheet) ====================== */}
      <AnimatePresence>
        {accionesTarget && (() => {
          const e = accionesTarget
          const owner = owners[e.id]
          const inactivo = e.pausada === true
          return (
            <ActionSheet title={e.nombreComercial} onClose={() => setAccionesTarget(null)}>
              <div className="grid grid-cols-3 gap-2">
                <AccionCard icon={User} label="Dueño" color="indigo" onClick={() => { setAccionesTarget(null); setDuenoTarget(e) }} />
                <AccionCard icon={CreditCard} label="Plan" color="emerald" onClick={() => { setAccionesTarget(null); setPlanTarget(e) }} />
                <AccionCard icon={MapPin} label="Sedes" color="sky" onClick={() => { setAccionesTarget(null); setSedeTarget(e) }} />
                <AccionCard icon={KeyRound} label={owner?.estado === false ? 'Activar acceso' : 'Apagar acceso'} color="amber" disabled={!owner} onClick={() => { setAccionesTarget(null); toggleAccesoAdmin(e) }} />
                <AccionCard icon={Power} label={inactivo ? 'Activar' : 'Desactivar'} color="violet" onClick={() => { setAccionesTarget(null); toggleEstado(e) }} />
                <AccionCard icon={Trash2} label="Eliminar" color="red" onClick={() => { setAccionesTarget(null); eliminarEmpresa(e) }} />
              </div>
            </ActionSheet>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}

/* ----------------------------------------------------------------- helpers UI */
const inputCls =
  'w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Hoja de acciones centrada (móvil y desktop). Nunca se corta. */
function ActionSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 30, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

const ACCION_COLORS: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  sky: 'bg-sky-100 text-sky-600',
  amber: 'bg-amber-100 text-amber-600',
  violet: 'bg-violet-100 text-violet-600',
  red: 'bg-red-100 text-red-600',
}

/** Tarjeta de acción con tile de color (estilo cards de barber.pe). */
function AccionCard({ icon: Icon, label, color, onClick, disabled }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: keyof typeof ACCION_COLORS
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-gray-100 bg-white transition hover:bg-gray-50 hover:border-gray-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${ACCION_COLORS[color]}`}>
        <Icon className="w-5 h-5" />
      </span>
      <span className={`text-xs font-medium text-center leading-tight ${color === 'red' ? 'text-red-600' : 'text-gray-700'}`}>{label}</span>
    </button>
  )
}

/* ----------------------------------------------------------------- Sedes */
function SedesModal({ empresa, onClose, onLimite }: { empresa: Empresa; onClose: (changed?: boolean) => void; onLimite: (v: number | null) => void }) {
  // Marca si el admin creó/eliminó/pausó/renombró alguna sede. Al cerrar, el
  // padre solo revalida (en segundo plano) si esto es true → sin parpadeo.
  const huboCambios = useRef(false)
  const cerrar = () => onClose(huboCambios.current)
  const [sedes, setSedes] = useState<SedeAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '', whatsapp: '' })
  const [saving, setSaving] = useState(false)
  const [limite, setLimiteLocal] = useState<number | null>(empresa.limiteSedesOverride ?? null)

  // Cambia el límite de sedes (override del plan) y avisa al padre.
  const cambiarLimite = (v: number | null) => { setLimiteLocal(v); onLimite(v) }

  // Edición de slug (solo SuperAdmin)
  const [editId, setEditId] = useState<number | null>(null)
  const [editSlug, setEditSlug] = useState('')
  const [savingSlug, setSavingSlug] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Activar / pausar una Sede puntual (reactivación por sede del SuperAdmin). Restaura
  // tanto el estado como la visibilidad pública. Nunca borra datos.
  const toggleSede = async (s: SedeAdmin) => {
    const activar = !(s.estado ?? true)
    setTogglingId(s.idSede)
    try {
      await empresasService.updateSede(s.idSede, { estado: activar, esPublica: activar })
      setSedes((list) => list.map((x) => (x.idSede === s.idSede ? { ...x, estado: activar, esPublica: activar } : x)))
      huboCambios.current = true
      toast.success(activar ? 'Sede reactivada.' : 'Sede pausada.')
    } catch {
      toast.error('No se pudo cambiar la Sede.')
    } finally {
      setTogglingId(null)
    }
  }

  const load = async () => {
    setLoading(true)
    try { setSedes(await empresasService.getSedes(empresa.id)) }
    catch { toast.error('No se pudieron cargar las sedes.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const crear = async () => {
    if (form.nombre.trim().length < 2) { toast.error('Ponle nombre a la sede.'); return }
    setSaving(true)
    const payload = {
      idEmpresa: empresa.id,
      nombre: form.nombre.trim(),
      direccion: form.direccion.trim(),
      departamento: '', provincia: '', distrito: '',
      latitud: 0, longitud: 0,
      telefono: form.telefono.trim(),
      whatsappContacto: form.whatsapp.trim(),
      correoContacto: '',
      zonaHoraria: 'America/Lima', moneda: 'PEN',
    }
    try {
      // El subdominio sale SOLO del nombre de la sede (ej. "nachobarber"),
      // NO del nombre comercial. Si ese slug ya está en uso, reintenta una
      // sola vez con un sufijo único de la empresa.
      const base = slugify(form.nombre) || `sede-${empresa.id}`
      try {
        await empresasService.createSede({ ...payload, subdominio: base, slug: base })
      } catch {
        const alt = `${base}-${empresa.id}`
        await empresasService.createSede({ ...payload, subdominio: alt, slug: alt })
      }
      huboCambios.current = true
      toast.success('Sede creada.')
      setForm({ nombre: '', direccion: '', telefono: '', whatsapp: '' })
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo crear la sede.')
    } finally { setSaving(false) }
  }

  const eliminar = async (s: SedeAdmin) => {
    if (!(await confirmDialog({
      title: 'Eliminar sede',
      message: `¿Eliminar la sede "${s.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      tone: 'danger',
    }))) return
    try { await empresasService.deleteSede(s.idSede); huboCambios.current = true; toast.success('Sede eliminada.'); await load() }
    catch { toast.error('No se pudo eliminar.') }
  }

  // Abrir editor del SLUG público (no toca el subdominio interno)
  const abrirEditor = (s: SedeAdmin) => {
    setEditId(s.idSede)
    setEditSlug(s.slug || '')
  }

  const guardarSlug = async (s: SedeAdmin) => {
    const nuevo = editSlug.trim().toLowerCase()
    if (!/^[a-z0-9-]{3,}$/.test(nuevo)) {
      toast.error('Slug inválido: solo minúsculas, números y guiones (mínimo 3).')
      return
    }
    if (nuevo === s.slug) { setEditId(null); return }
    if (!(await confirmDialog({
      title: 'Cambiar dirección pública',
      message: `Vas a cambiar la URL de "${s.nombre}" a ${slugify(empresa.nombreComercial)}.barber.pe/${nuevo}. Esto ROMPE los enlaces, QR y favoritos con el slug anterior. ¿Continuar?`,
      confirmText: 'Sí, cambiar',
      cancelText: 'Cancelar',
      tone: 'danger',
    }))) return
    setSavingSlug(true)
    try {
      await empresasService.cambiarSlugSede(s.idSede, nuevo)
      huboCambios.current = true
      toast.success('Slug actualizado.')
      setEditId(null)
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo cambiar el slug.')
    } finally { setSavingSlug(false) }
  }

  return (
    <Modal onClose={cerrar}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Store className="w-5 h-5 text-blue-600" /> Sedes de {empresa.nombreComercial}
      </h2>
      <p className="text-sm text-gray-500 mb-4">La dirección pública sale del distrito (negocio.barber.pe/distrito); puedes editarla con el lápiz.</p>

      {/* Límite de sedes permitidas (override del plan) */}
      <div className="mb-5 rounded-xl bg-gray-50 border border-gray-200 p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Sedes permitidas</span>
          <div className="inline-flex items-center gap-1">
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" onClick={() => cambiarLimite(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
                  limite === n ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
                {n}
              </button>
            ))}
            <button type="button" onClick={() => cambiarLimite(-1)} title="Ilimitadas"
              className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
                (limite ?? 0) < 0 ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
              ∞
            </button>
            <button type="button" onClick={() => cambiarLimite(null)} title="Usar el límite del plan"
              className={`px-3 h-8 rounded-lg text-xs font-semibold transition ${
                limite == null ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
              Plan
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Override manual. "Plan" respeta el límite del plan contratado.</p>
      </div>

      {loading ? (
        <div className="py-6 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : (
        <div className="space-y-2 mb-5">
          {sedes.length === 0 && <p className="text-sm text-gray-400">Sin sedes todavía.</p>}
          {sedes.map((s) => (
            <div key={s.idSede} className="p-3 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">{s.direccion || 'Sin dirección'}</p>
                  <p className="text-xs text-blue-500 truncate">
                    {slugify(empresa.nombreComercial)}.barber.pe{sedes.length >= 2 ? `/${s.slug || ''}` : ''}
                  </p>
                  {s.subdominio && (
                    <p className="text-[10px] text-gray-300 truncate">id interno: {s.subdominio}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleSede(s)}
                  disabled={togglingId === s.idSede}
                  title={(s.estado ?? true) ? 'Pausar Sede' : 'Reactivar Sede'}
                  className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full transition ${
                    (s.estado ?? true)
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {togglingId === s.idSede ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                  {(s.estado ?? true) ? 'Activa' : 'Pausada'}
                </button>
                <button onClick={() => abrirEditor(s)} title="Cambiar slug"
                  className="text-gray-300 hover:text-blue-500 shrink-0">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(s)} title="Eliminar"
                  className="text-gray-300 hover:text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {editId === s.idSede && (
                <div className="mt-3 pl-6 space-y-2">
                  <input className={inputCls} value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)} />
                  <button type="button" onClick={() => setEditSlug(slugify(s.distrito || s.nombre))}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
                    <RefreshCw className="w-3 h-3" /> Regenerar desde el distrito ({slugify(s.distrito || s.nombre) || '—'})
                  </button>
                  <p className="text-[11px] text-amber-600 leading-snug">
                    ⚠ Cambiará la URL pública a <strong>{slugify(empresa.nombreComercial)}.barber.pe/{(editSlug.trim() || '...')}</strong> y romperá los enlaces anteriores de esta sede.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => guardarSlug(s)} disabled={savingSlug}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
                      {savingSlug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400 leading-snug">
        El cupo de sedes se define con el control <b>Sedes: 1 · 2 · 3 · ∞</b> de la tarjeta.
        Cada dueño crea sus propias sedes desde su panel.
      </p>
    </Modal>
  )
}
