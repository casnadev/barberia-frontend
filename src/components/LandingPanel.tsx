import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, Star, Loader2, Save, Store, MessageSquare, Tag } from 'lucide-react'
import {
  superAdminLandingService as svc,
  type LandingSede, type LandingResena, type PlanEdit,
} from '@/services/superAdminLandingService'

type Tab = 'sedes' | 'resenas' | 'planes'

export function LandingPanel() {
  const [tab, setTab] = useState<Tab>('sedes')

  return (
    <div>
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 mb-5 text-white">
        <h2 className="text-lg font-bold">Landing principal</h2>
        <p className="text-sm text-white/80">Controla qué sedes y reseñas se muestran, y edita tus planes.</p>
      </div>

      <div className="inline-flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {([
          ['sedes', 'Sedes', Store],
          ['resenas', 'Reseñas', MessageSquare],
          ['planes', 'Planes', Tag],
        ] as [Tab, string, any][]).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === k ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'sedes' && <SedesTab />}
      {tab === 'resenas' && <ResenasTab />}
      {tab === 'planes' && <PlanesTab />}
    </div>
  )
}

// ───────────────────────────── SEDES ─────────────────────────────
function SedesTab() {
  const [sedes, setSedes] = useState<LandingSede[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  const cargar = () => { setLoading(true); svc.getSedes().then(setSedes).catch(() => toast.error('No se pudieron cargar las sedes.')).finally(() => setLoading(false)) }
  useEffect(cargar, [])

  const toggle = async (s: LandingSede) => {
    setBusy(s.idSede)
    try {
      await svc.toggleSede(s.idSede, !s.mostrarEnLanding)
      setSedes((prev) => prev.map((x) => x.idSede === s.idSede ? { ...x, mostrarEnLanding: !x.mostrarEnLanding } : x))
      toast.success(!s.mostrarEnLanding ? 'Sede visible en la landing.' : 'Sede oculta.')
    } catch { toast.error('No se pudo actualizar.') }
    finally { setBusy(null) }
  }

  if (loading) return <Cargando />
  if (!sedes.length) return <Vacio texto="No hay sedes registradas." />

  const visibles = sedes.filter((s) => s.mostrarEnLanding).length
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">{visibles} visible(s) en la landing de {sedes.length} sede(s). Activa las que quieras mostrar en “Ya confían en nosotros”.</p>
      <div className="space-y-2">
        {sedes.map((s) => (
          <div key={s.idSede} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{s.nombre} {!s.activa && <span className="text-xs text-red-500">(inactiva)</span>}</p>
              <p className="text-xs text-gray-500 truncate">{s.direccion || 'Sin dirección'} · {s.subdominio}</p>
            </div>
            <button onClick={() => toggle(s)} disabled={busy === s.idSede}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                s.mostrarEnLanding ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {busy === s.idSede ? <Loader2 size={15} className="animate-spin" /> : (s.mostrarEnLanding ? <Eye size={15} /> : <EyeOff size={15} />)}
              {s.mostrarEnLanding ? 'Visible' : 'Oculta'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────── RESEÑAS ─────────────────────────────
function ResenasTab() {
  const [items, setItems] = useState<LandingResena[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  const cargar = () => { setLoading(true); svc.getResenas().then(setItems).catch(() => toast.error('No se pudieron cargar las reseñas.')).finally(() => setLoading(false)) }
  useEffect(cargar, [])

  const toggle = async (r: LandingResena) => {
    setBusy(r.idCalificacion)
    try {
      await svc.toggleResena(r.idCalificacion, !r.mostrarEnLanding)
      setItems((prev) => prev.map((x) => x.idCalificacion === r.idCalificacion ? { ...x, mostrarEnLanding: !x.mostrarEnLanding } : x))
      toast.success(!r.mostrarEnLanding ? 'Reseña visible en la landing.' : 'Reseña oculta.')
    } catch { toast.error('No se pudo actualizar.') }
    finally { setBusy(null) }
  }

  if (loading) return <Cargando />
  if (!items.length) return <Vacio texto="Aún no hay reseñas con comentario." />

  const visibles = items.filter((r) => r.mostrarEnLanding).length
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">{visibles} visible(s) de {items.length}. Elige una por una cuáles aparecen en la sección de reseñas.</p>
      <div className="space-y-2">
        {items.map((r) => (
          <div key={r.idCalificacion} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className={i < r.puntuacion ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                  ))}
                </div>
                <p className="text-sm text-gray-800">“{r.comentario}”</p>
                <p className="text-xs text-gray-500 mt-1">{r.nombreCliente || 'Cliente'} · {r.nombreSede}</p>
              </div>
              <button onClick={() => toggle(r)} disabled={busy === r.idCalificacion}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                  r.mostrarEnLanding ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {busy === r.idCalificacion ? <Loader2 size={15} className="animate-spin" /> : (r.mostrarEnLanding ? <Eye size={15} /> : <EyeOff size={15} />)}
                {r.mostrarEnLanding ? 'Visible' : 'Oculta'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────── PLANES ─────────────────────────────
function PlanesTab() {
  const [planes, setPlanes] = useState<PlanEdit[]>([])
  const [loading, setLoading] = useState(true)
  const [editar, setEditar] = useState<PlanEdit | null>(null)
  const [saving, setSaving] = useState(false)

  const cargar = () => { setLoading(true); svc.getPlanes().then(setPlanes).catch(() => toast.error('No se pudieron cargar los planes.')).finally(() => setLoading(false)) }
  useEffect(cargar, [])

  const guardar = async () => {
    if (!editar) return
    setSaving(true)
    try {
      await svc.editarPlan(editar)
      toast.success('Plan actualizado.')
      setEditar(null); cargar()
    } catch { toast.error('No se pudo guardar el plan.') }
    finally { setSaving(false) }
  }

  if (loading) return <Cargando />
  if (!planes.length) return <Vacio texto="No hay planes configurados." />

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Edita precio, nombre, límites, permisos, “Más popular” y visibilidad. Puedes cambiarlos cuando quieras.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {planes.map((p) => (
          <div key={p.idPlan} className={`bg-white border rounded-xl p-4 ${p.esPopular ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'} ${!p.activo ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">{p.nombre}</p>
              {p.esPopular && <span className="text-xs font-semibold text-blue-600 flex items-center gap-1"><Star size={12} className="fill-blue-600" /> Popular</span>}
            </div>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{p.precioMensualPEN <= 0 ? 'Gratis' : `S/ ${p.precioMensualPEN}`}<span className="text-xs font-normal text-gray-400">{p.precioMensualPEN > 0 ? ' /mes' : ''}</span></p>
            <p className="text-xs text-gray-500 mt-1">{p.limiteSedes} sede(s) · {p.limiteTrabajadores} barbero(s){!p.activo && ' · oculto'}</p>
            <button onClick={() => setEditar({ ...p })} className="mt-3 w-full text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50">Editar</button>
          </div>
        ))}
      </div>

      {editar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !saving && setEditar(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Editar plan</h3>
            <div className="space-y-3">
              <Campo label="Nombre"><input className={inp} value={editar.nombre} onChange={(e) => setEditar({ ...editar, nombre: e.target.value })} /></Campo>
              <Campo label="Descripción"><input className={inp} value={editar.descripcion || ''} onChange={(e) => setEditar({ ...editar, descripcion: e.target.value })} /></Campo>
              <div className="grid grid-cols-3 gap-3">
                <Campo label="Precio S/"><input type="number" className={inp} value={editar.precioMensualPEN} onChange={(e) => setEditar({ ...editar, precioMensualPEN: Number(e.target.value) })} /></Campo>
                <Campo label="Sedes"><input type="number" className={inp} value={editar.limiteSedes} onChange={(e) => setEditar({ ...editar, limiteSedes: Number(e.target.value) })} /></Campo>
                <Campo label="Barberos"><input type="number" className={inp} value={editar.limiteTrabajadores} onChange={(e) => setEditar({ ...editar, limiteTrabajadores: Number(e.target.value) })} /></Campo>
              </div>
              <Check label="Recordatorios por WhatsApp" v={editar.permiteWhatsApp} on={(v) => setEditar({ ...editar, permiteWhatsApp: v })} />
              <Check label="Reportes y exportación" v={editar.permiteReportes} on={(v) => setEditar({ ...editar, permiteReportes: v })} />
              <Check label="Marcar como “Más popular”" v={editar.esPopular} on={(v) => setEditar({ ...editar, esPopular: v })} />
              <Check label="Visible en la landing" v={editar.activo} on={(v) => setEditar({ ...editar, activo: v })} />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditar(null)} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-600">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── helpers UI ──
const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200'
const Campo = ({ label, children }: { label: string; children: any }) => (
  <label className="block"><span className="text-xs font-semibold text-gray-500">{label}</span><div className="mt-1">{children}</div></label>
)
const Check = ({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) => (
  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
    <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="w-4 h-4 accent-blue-600" /> {label}
  </label>
)
const Cargando = () => <div className="flex justify-center py-12 text-gray-400"><Loader2 className="animate-spin" /></div>
const Vacio = ({ texto }: { texto: string }) => <div className="text-center py-12 text-gray-400 text-sm">{texto}</div>
