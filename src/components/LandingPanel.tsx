import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, Star, Loader2, Save, Store, MessageSquare } from 'lucide-react'
import { nombreParaMostrar } from '@/utils/nombreParaMostrar'
import {
  superAdminLandingService as svc,
  type LandingSede, type LandingResena,
} from '@/services/superAdminLandingService'

type Tab = 'sedes' | 'resenas'

export function LandingPanel() {
  const [tab, setTab] = useState<Tab>('sedes')

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Landing principal</h2>
        <p className="text-sm text-gray-500">Controla qué sedes y reseñas se muestran, y edita tus planes.</p>
      </div>

      <div className="inline-flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {([
          ['sedes', 'Sedes', Store],
          ['resenas', 'Reseñas', MessageSquare],
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
              <p className="font-semibold text-gray-900 truncate">{nombreParaMostrar(s, { forzarMulti: true })} {!s.activa && <span className="text-xs text-red-500">(inactiva)</span>}</p>
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


// ── helpers UI ──
const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200'
const Cargando = () => <div className="flex justify-center py-12 text-gray-400"><Loader2 className="animate-spin" /></div>
const Vacio = ({ texto }: { texto: string }) => <div className="text-center py-12 text-gray-400 text-sm">{texto}</div>
