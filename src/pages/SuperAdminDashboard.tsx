import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'
import {
  Scissors, LogOut, Plus, Building2, MapPin, KeyRound, Power,
  X, ArrowRight, ArrowLeft, Check, Mail, Phone, CreditCard,
  Store, Trash2, ShieldCheck, Send, Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { AccountMenu } from '@/components/AccountMenu'
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

type WizForm = {
  nombreComercial: string; razonSocial: string; ruc: string
  empCorreo: string; empTelefono: string
  ownerNombre: string; canal: CanalAcceso; ownerCorreo: string; ownerTelefono: string
  idPlan: number | null
}
const emptyWiz: WizForm = {
  nombreComercial: '', razonSocial: '', ruc: '',
  empCorreo: '', empTelefono: '',
  ownerNombre: '', canal: 'Email', ownerCorreo: '', ownerTelefono: '',
  idPlan: null,
}

export function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [owners, setOwners] = useState<Record<number, Admin | null>>({})
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  // Wizard
  const [wizOpen, setWizOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [wiz, setWiz] = useState<WizForm>(emptyWiz)
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
      const map: Record<number, Admin | null> = {}
      await Promise.all(emps.map(async (e) => {
        try { const as = await empresasService.getAdminsEmpresa(e.id); map[e.id] = as[0] ?? null }
        catch { map[e.id] = null }
      }))
      setOwners(map)
    } catch {
      toast.error('No se pudieron cargar las barberías.')
    } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  const stats = useMemo(() => {
    const total = empresas.length
    const activas = empresas.filter((e) => owners[e.id]?.estado !== false && owners[e.id]).length
    const sinAcceso = empresas.filter((e) => owners[e.id] == null).length
    return { total, activas, sinAcceso }
  }, [empresas, owners])

  // ----------------------------------------------------------------- Wizard
  const openWizard = () => { setWiz(emptyWiz); setStep(1); setWizOpen(true) }

  const puedeAvanzar = () => {
    if (step === 1) return wiz.nombreComercial.trim().length >= 2
    if (step === 2) return wiz.canal === 'Email'
      ? /\S+@\S+\.\S+/.test(wiz.ownerCorreo.trim())
      : wiz.ownerTelefono.trim().length >= 6
    if (step === 3) return wiz.idPlan != null
    return false
  }

  const crearTodo = async () => {
    if (wiz.idPlan == null) return
    setSaving(true)
    try {
      // 1) Empresa
      const empresa = await empresasService.createEmpresa({
        razonSocial: (wiz.razonSocial.trim() || wiz.nombreComercial.trim()),
        nombreComercial: wiz.nombreComercial.trim(),
        ruc: wiz.ruc.trim(),
        correoContacto: wiz.empCorreo.trim(),
        telefonoContacto: wiz.empTelefono.trim(),
      })

      // 2) Admin (correo O teléfono, sin password)
      const admin = await empresasService.createAdminEmpresa(empresa.id, {
        nombreCompleto: wiz.ownerNombre.trim() || undefined,
        correo: wiz.canal === 'Email' ? wiz.ownerCorreo.trim() : undefined,
        telefono: wiz.canal === 'WhatsApp' ? wiz.ownerTelefono.trim() : undefined,
      })

      // 3) Plan (activa de inmediato). Prueba (precio 0) vence en 14 días.
      const plan = planes.find((p) => p.idPlan === wiz.idPlan)!
      let fechaFin: string | null = null
      if (plan.precioMensualPEN === 0) {
        const d = new Date(); d.setDate(d.getDate() + 14); fechaFin = d.toISOString().slice(0, 10)
      }
      await empresasService.asignarSuscripcion(empresa.id, wiz.idPlan, fechaFin)

      toast.success(`"${empresa.nombreComercial}" creada con plan ${plan.nombre}.`)
      setWizOpen(false)

      // 4) Ofrecer enviar acceso ya
      const canal = wiz.canal
      const enviar = await confirmDialog({
        title: 'Enviar acceso',
        message: `¿Enviar el código de acceso al dueño por ${canal === 'Email' ? 'correo' : 'WhatsApp'} ahora?`,
        confirmText: 'Enviar ahora',
        cancelText: 'Más tarde',
      })
      if (enviar) await enviarAcceso(admin.id, canal)

      await loadAll()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo completar la creación.')
    } finally { setSaving(false) }
  }

  // ----------------------------------------------------------------- Acciones tarjeta
  const enviarAcceso = async (idUsuario: number, canal: CanalAcceso) => {
    try {
      await empresasService.darAcceso(idUsuario, canal)
      toast.success(`Código enviado por ${canal === 'Email' ? 'correo' : 'WhatsApp'}.`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudo enviar el acceso.')
    }
  }

  const darAccesoEmpresa = async (e: Empresa) => {
    const owner = owners[e.id]
    if (!owner) { toast.error('Esta barbería no tiene dueño asignado.'); return }
    let canal: CanalAcceso | null = null
    if (owner.correo && owner.telefono) {
      canal = window.confirm('¿Enviar por CORREO? (Cancelar = WhatsApp)') ? 'Email' : 'WhatsApp'
    } else if (owner.correo) canal = 'Email'
    else if (owner.telefono) canal = 'WhatsApp'
    if (!canal) { toast.error('El dueño no tiene correo ni teléfono.'); return }
    await enviarAcceso(owner.id, canal)
  }

  const toggleEstado = async (e: Empresa) => {
    const owner = owners[e.id]
    if (!owner) return
    const activar = owner.estado === false
    try {
      await empresasService.setUsuarioEstado(owner.id, activar)
      setOwners((m) => ({ ...m, [e.id]: { ...owner, estado: activar } }))
      toast.success(activar ? 'Barbería activada.' : 'Barbería desactivada.')
    } catch { toast.error('No se pudo cambiar el estado.') }
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
    } catch { toast.error('No se pudo asignar el plan.') }
  }

  // ================================================================= UI
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1380px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Barber.PE</h1>
              <p className="text-xs text-gray-500 -mt-0.5">Panel maestro</p>
            </div>
          </div>
          <AccountMenu variant="plain" />
        </div>
      </header>

      <main className="max-w-[1380px] mx-auto px-4 py-7">
        {/* Stats + acción */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="grid grid-cols-3 gap-3 flex-1 max-w-md">
            {[
              { label: 'Barberías', value: stats.total, icon: Building2 },
              { label: 'Activas', value: stats.activas, icon: Power },
              { label: 'Sin dueño', value: stats.sinAcceso, icon: KeyRound },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3">
                <s.icon className="w-4 h-4 text-blue-600 mb-1" />
                <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <button onClick={openWizard}
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
              const inactivo = owner?.estado === false
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-white border rounded-2xl p-5 ${inactivo ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{e.nombreComercial}</h3>
                      <p className="text-xs text-gray-400 truncate">{e.razonSocial}</p>
                    </div>
                    {inactivo
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactiva</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">Activa</span>}
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
                    <button onClick={() => darAccesoEmpresa(e)} disabled={!owner}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition disabled:opacity-40">
                      <Send className="w-4 h-4" /> Dar acceso
                    </button>
                    <button onClick={() => setPlanTarget(e)}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition">
                      <CreditCard className="w-4 h-4" /> Plan
                    </button>
                    <button onClick={() => setSedeTarget(e)}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition">
                      <MapPin className="w-4 h-4" /> Sedes
                    </button>
                    <button onClick={() => toggleEstado(e)} disabled={!owner}
                      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-40 ml-auto ${
                        inactivo ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                      <Power className="w-4 h-4" /> {inactivo ? 'Activar' : 'Desactivar'}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>

      {/* ============================== WIZARD ============================== */}
      <AnimatePresence>
        {wizOpen && (
          <Modal onClose={() => !saving && setWizOpen(false)}>
            <div className="flex items-center gap-2 mb-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className={`h-1.5 flex-1 rounded-full transition ${n <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-4">Paso {step} de 3</p>

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">El negocio</h2>
                <Field label="Nombre del negocio *">
                  <input className={inputCls} value={wiz.nombreComercial}
                    onChange={(e) => setWiz({ ...wiz, nombreComercial: e.target.value })}
                    placeholder="Barbería Nader" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Razón social (opcional)">
                    <input className={inputCls} value={wiz.razonSocial}
                      onChange={(e) => setWiz({ ...wiz, razonSocial: e.target.value })}
                      placeholder="Se usa el nombre del negocio" />
                  </Field>
                  <Field label="RUC (opcional)">
                    <input className={inputCls} value={wiz.ruc}
                      onChange={(e) => setWiz({ ...wiz, ruc: e.target.value })} placeholder="20•••••••••" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Correo del negocio (opcional)">
                    <input className={inputCls} value={wiz.empCorreo}
                      onChange={(e) => setWiz({ ...wiz, empCorreo: e.target.value })} placeholder="hola@negocio.com" />
                  </Field>
                  <Field label="Teléfono del negocio (opcional)">
                    <input className={inputCls} value={wiz.empTelefono}
                      onChange={(e) => setWiz({ ...wiz, empTelefono: e.target.value })} placeholder="987654321" />
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">El dueño</h2>
                <p className="text-sm text-gray-500 -mt-2">Solo necesitas un contacto. Sin contraseña — él creará su PIN.</p>
                <Field label="Nombre del dueño (opcional)">
                  <input className={inputCls} value={wiz.ownerNombre}
                    onChange={(e) => setWiz({ ...wiz, ownerNombre: e.target.value })}
                    placeholder="Se usará el nombre del negocio" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  {(['Email', 'WhatsApp'] as CanalAcceso[]).map((c) => (
                    <button key={c} type="button" onClick={() => setWiz({ ...wiz, canal: c })}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition inline-flex items-center justify-center gap-2 ${
                        wiz.canal === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                      {c === 'Email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      {c === 'Email' ? 'Correo' : 'WhatsApp'}
                    </button>
                  ))}
                </div>
                {wiz.canal === 'Email' ? (
                  <Field label="Correo del dueño *">
                    <input className={inputCls} value={wiz.ownerCorreo} autoCapitalize="none"
                      onChange={(e) => setWiz({ ...wiz, ownerCorreo: e.target.value })} placeholder="dueño@gmail.com" />
                  </Field>
                ) : (
                  <Field label="WhatsApp del dueño *">
                    <input className={inputCls} value={wiz.ownerTelefono}
                      onChange={(e) => setWiz({ ...wiz, ownerTelefono: e.target.value })} placeholder="987654321" />
                  </Field>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">El plan</h2>
                <p className="text-sm text-gray-500 -mt-2">Se activa de inmediato. La prueba dura 14 días.</p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {planes.map((p) => (
                    <button key={p.idPlan} type="button" onClick={() => setWiz({ ...wiz, idPlan: p.idPlan })}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        wiz.idPlan === p.idPlan ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{p.nombre}</span>
                        <span className="font-bold text-blue-700">{soles(p.precioMensualPEN)}<span className="text-xs font-normal text-gray-400">/mes</span></span>
                      </div>
                      {p.descripcion && <p className="text-xs text-gray-500 mt-1">{p.descripcion}</p>}
                    </button>
                  ))}
                  {planes.length === 0 && <p className="text-sm text-gray-400">No hay planes. Corre el SQL de planes.</p>}
                </div>
              </div>
            )}

            {/* Nav */}
            <div className="flex items-center justify-between mt-6">
              <button type="button" disabled={saving}
                onClick={() => step === 1 ? setWizOpen(false) : setStep(step - 1)}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
                <ArrowLeft className="w-4 h-4" /> {step === 1 ? 'Cancelar' : 'Atrás'}
              </button>
              {step < 3 ? (
                <button type="button" disabled={!puedeAvanzar()} onClick={() => setStep(step + 1)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-40">
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" disabled={!puedeAvanzar() || saving} onClick={crearTodo}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-40">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Creando...' : 'Crear y activar'}
                </button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ============================== PLAN ============================== */}
      <AnimatePresence>
        {planTarget && (
          <Modal onClose={() => setPlanTarget(null)}>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Plan de {planTarget.nombreComercial}</h2>
            <p className="text-sm text-gray-500 mb-4">Elige el plan a activar.</p>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {planes.map((p) => (
                <button key={p.idPlan} type="button" onClick={() => asignarPlan(p.idPlan)}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{p.nombre}</span>
                    <span className="font-bold text-blue-700">{soles(p.precioMensualPEN)}<span className="text-xs font-normal text-gray-400">/mes</span></span>
                  </div>
                  {p.descripcion && <p className="text-xs text-gray-500 mt-1">{p.descripcion}</p>}
                </button>
              ))}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ============================== SEDES ============================== */}
      <AnimatePresence>
        {sedeTarget && (
          <SedesModal empresa={sedeTarget} onClose={() => setSedeTarget(null)} />
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
      className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
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
    try {
      const base = slugify(`${empresa.nombreComercial}-${form.nombre}`) || slugify(form.nombre)
      await empresasService.createSede({
        idEmpresa: empresa.id,
        nombre: form.nombre.trim(),
        subdominio: base,
        slug: base,
        direccion: form.direccion.trim(),
        departamento: '', provincia: '', distrito: '',
        latitud: 0, longitud: 0,
        telefono: form.telefono.trim(),
        whatsappContacto: form.whatsapp.trim(),
        correoContacto: '',
        zonaHoraria: 'America/Lima', moneda: 'PEN',
      })
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

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Store className="w-5 h-5 text-blue-600" /> Sedes de {empresa.nombreComercial}
      </h2>
      <p className="text-sm text-gray-500 mb-4">El subdominio se genera solo desde el nombre.</p>

      {loading ? (
        <div className="py-6 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : (
        <div className="space-y-2 mb-5">
          {sedes.length === 0 && <p className="text-sm text-gray-400">Sin sedes todavía.</p>}
          {sedes.map((s) => (
            <div key={s.idSede} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{s.nombre}</p>
                <p className="text-xs text-gray-400 truncate">{s.direccion || 'Sin dirección'} · /{s.subdominio}</p>
              </div>
              <button onClick={() => eliminar(s)} className="ml-auto text-gray-300 hover:text-red-500 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Agregar sede</p>
        <input className={inputCls} placeholder="Nombre de la sede" value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <input className={inputCls} placeholder="Dirección" value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="Teléfono" value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <input className={inputCls} placeholder="WhatsApp" value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        </div>
        <button onClick={crear} disabled={saving}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar
        </button>
      </div>
    </Modal>
  )
}
