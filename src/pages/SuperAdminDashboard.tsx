import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import {
  Scissors, Plus, Building2, MapPin, KeyRound, Power,
  X, Check, Mail, Phone, CreditCard,
  Store, Trash2, Loader2, Pencil, RefreshCw,
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

  const loadAll = async () => {
    setLoading(true)
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
  useEffect(() => { loadAll() }, [])

  const stats = useMemo(() => {
    const total = empresas.length
    const activas = empresas.filter((e) => !e.pausada).length
    const sinAcceso = empresas.filter((e) => owners[e.id] == null).length
    return { total, activas, sinAcceso }
  }, [empresas, owners])

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
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {empresas.map((e) => {
              const owner = owners[e.id]
              const inactivo = e.pausada === true
              const esPrueba = (e.planActual || '').toLowerCase().includes('prueba')
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-white border rounded-2xl p-5 ${inactivo ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{e.nombreComercial}</h3>
                      <p className="text-xs text-gray-400 truncate">{e.razonSocial}</p>
                    </div>
                    {inactivo
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">Inactiva</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 shrink-0">Activa</span>}
                  </div>

                  {/* Plan + sedes (siempre visible) */}
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
                  </div>

                  {/* Dueño */}
                  <div className="mt-3 text-sm">
                    {owner ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        {owner.correo
                          ? <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                          : <Phone className="w-4 h-4 text-gray-400 shrink-0" />}
                        <span className="truncate">{owner.correo || owner.telefono}</span>
                        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          owner.metodoLogin === 'Password' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                          {owner.metodoLogin === 'Password' ? 'Contraseña' : 'PIN / OTP'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-red-500">Sin dueño asignado</span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => toggleAccesoAdmin(e)} disabled={!owner}
                      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-40 ${
                        owner?.estado === false
                          ? 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                      <KeyRound className="w-4 h-4" /> {owner?.estado === false ? 'Acceso apagado' : 'Acceso activo'}
                    </button>
                    <button onClick={() => setPlanTarget(e)}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition">
                      <CreditCard className="w-4 h-4" /> Plan
                    </button>
                    <button onClick={() => setSedeTarget(e)}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition">
                      <MapPin className="w-4 h-4" /> Sedes
                    </button>
                    <button onClick={() => toggleEstado(e)}
                      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-40 ml-auto ${
                        inactivo ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                      <Power className="w-4 h-4" /> {inactivo ? 'Activar' : 'Desactivar'}
                    </button>
                    <button onClick={() => eliminarEmpresa(e)} title="Eliminar barbería"
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">
                      <Trash2 className="w-4 h-4" /> Eliminar
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
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Barbería Nader" />
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
                    onChange={(e) => setForm({ ...form, ownerCorreo: e.target.value })} placeholder="dueño@gmail.com" />
                  {form.ownerCorreo.trim() && !emailOk &&
                    <p className="text-xs text-red-500 mt-1">Correo inválido.</p>}
                </Field>
              ) : (
                <Field label="WhatsApp del dueño *">
                  <input className={inputCls} value={form.ownerTelefono} inputMode="numeric"
                    onChange={(e) => setForm({ ...form, ownerTelefono: e.target.value })} placeholder="987654321" />
                  {form.ownerTelefono.trim() && !telOk &&
                    <p className="text-xs text-red-500 mt-1">Debe ser un celular peruano: 9 dígitos que empiezan en 9.</p>}
                </Field>
              )}

              <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>Se crea con el plan <strong>Prueba</strong> (14 días) y una <strong>sede inicial</strong>. El subdominio se genera del nombre y solo tú puedes cambiarlo.</span>
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
          <SedesModal empresa={sedeTarget} onClose={() => { setSedeTarget(null); loadAll() }} />
        )}
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

/* ----------------------------------------------------------------- Sedes */
function SedesModal({ empresa, onClose }: { empresa: Empresa; onClose: () => void }) {
  const [sedes, setSedes] = useState<SedeAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', direccion: '', telefono: '', whatsapp: '' })
  const [saving, setSaving] = useState(false)

  // Edición de slug (solo SuperAdmin)
  const [editId, setEditId] = useState<number | null>(null)
  const [editSlug, setEditSlug] = useState('')
  const [savingSlug, setSavingSlug] = useState(false)

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
    try { await empresasService.deleteSede(s.idSede); toast.success('Sede eliminada.'); await load() }
    catch { toast.error('No se pudo eliminar.') }
  }

  // Abrir editor y guardar el nuevo slug/subdominio (con advertencia)
  const abrirEditor = (s: SedeAdmin) => {
    setEditId(s.idSede)
    setEditSlug(s.subdominio || '')
  }

  const guardarSlug = async (s: SedeAdmin) => {
    const nuevo = editSlug.trim().toLowerCase()
    if (!/^[a-z0-9-]{3,}$/.test(nuevo)) {
      toast.error('Slug inválido: solo minúsculas, números y guiones (mínimo 3).')
      return
    }
    if (nuevo === s.subdominio) { setEditId(null); return }
    if (!(await confirmDialog({
      title: 'Cambiar slug',
      message: `Vas a cambiar la URL de "${s.nombre}" a ${nuevo}.barber.pe. Esto ROMPE los enlaces, QR y favoritos que apuntaban al slug anterior. ¿Continuar?`,
      confirmText: 'Sí, cambiar',
      cancelText: 'Cancelar',
      tone: 'danger',
    }))) return
    setSavingSlug(true)
    try {
      await empresasService.cambiarSlugSede(s.idSede, nuevo)
      toast.success('Slug actualizado.')
      setEditId(null)
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo cambiar el slug.')
    } finally { setSavingSlug(false) }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Store className="w-5 h-5 text-blue-600" /> Sedes de {empresa.nombreComercial}
      </h2>
      <p className="text-sm text-gray-500 mb-4">El subdominio se genera del nombre; puedes editarlo con el lápiz.</p>

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
                  <p className="text-xs text-gray-400 truncate">{s.direccion || 'Sin dirección'} · /{s.subdominio}</p>
                </div>
                <button onClick={() => abrirEditor(s)} title="Cambiar slug"
                  className="ml-auto text-gray-300 hover:text-blue-500 shrink-0">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(s)} title="Eliminar"
                  className="text-gray-300 hover:text-red-500 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {editId === s.idSede && (
                <div className="mt-3 pl-6 space-y-2">
                  <input className={inputCls} value={editSlug} placeholder="nuevo-slug"
                    onChange={(e) => setEditSlug(e.target.value)} />
                  <button type="button" onClick={() => setEditSlug(slugify(s.nombre))}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
                    <RefreshCw className="w-3 h-3" /> Regenerar desde el nombre ({slugify(s.nombre) || '—'})
                  </button>
                  <p className="text-[11px] text-amber-600 leading-snug">
                    ⚠ Cambiará la URL pública a <strong>{(editSlug.trim() || '...')}.barber.pe</strong> y romperá los enlaces anteriores de esta sede.
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

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Agregar sede</p>
        <input className={inputCls} placeholder="Nombre de la sede" value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <button onClick={crear} disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar
        </button>
      </div>
    </Modal>
  )
}
