import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2, Award, Gift, Sparkles } from 'lucide-react'
import {
  fidelizacionService,
  type ProgramaConfig,
  type NivelFidel,
  type RecompensaFidel,
} from '@/services/fidelizacionService'

const NIVEL_VACIO: NivelFidel = { nombre: '', puntosMinimos: 0, orden: 0, color: '#C9A227' }
const RECOMPENSA_VACIA: RecompensaFidel = { nombre: '', puntosRequeridos: 100, activo: true }

const VENCIMIENTOS = [
  { v: '', label: 'No vencen' },
  { v: '6', label: '6 meses' },
  { v: '12', label: '12 meses' },
  { v: '24', label: '24 meses' },
]

const input =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500'

export function ProgramaFidelizacionPanel() {
  const [cfg, setCfg] = useState<ProgramaConfig>({ activo: false, solesPorPunto: 1, puntosExpiranMeses: null, niveles: [], recompensas: [] })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fidelizacionService.getConfig()
      .then(setCfg)
      .catch(() => toast.error('No se pudo cargar el programa'))
      .finally(() => setCargando(false))
  }, [])

  const set = (patch: Partial<ProgramaConfig>) => setCfg((c) => ({ ...c, ...patch }))

  // --- Niveles ---
  const addNivel = () => set({ niveles: [...cfg.niveles, { ...NIVEL_VACIO }] })
  const setNivel = (i: number, patch: Partial<NivelFidel>) =>
    set({ niveles: cfg.niveles.map((n, k) => (k === i ? { ...n, ...patch } : n)) })
  const delNivel = (i: number) => set({ niveles: cfg.niveles.filter((_, k) => k !== i) })

  // --- Recompensas ---
  const addRec = () => set({ recompensas: [...cfg.recompensas, { ...RECOMPENSA_VACIA }] })
  const setRec = (i: number, patch: Partial<RecompensaFidel>) =>
    set({ recompensas: cfg.recompensas.map((r, k) => (k === i ? { ...r, ...patch } : r)) })
  const delRec = (i: number) => set({ recompensas: cfg.recompensas.filter((_, k) => k !== i) })

  const guardar = async () => {
    if (cfg.solesPorPunto <= 0) { toast.error('Los soles por punto deben ser mayores a 0'); return }
    if (cfg.niveles.some((n) => !n.nombre.trim())) { toast.error('Cada nivel necesita un nombre'); return }
    if (cfg.recompensas.some((r) => !r.nombre.trim())) { toast.error('Cada recompensa necesita un nombre'); return }
    setGuardando(true)
    try {
      // orden de niveles = posición en la lista
      const payload: ProgramaConfig = {
        ...cfg,
        niveles: cfg.niveles.map((n, i) => ({ ...n, orden: i })),
      }
      await fidelizacionService.guardarConfig(payload)
      toast.success('Programa de fidelización guardado')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Activar + reglas base */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Programa de Fidelización</h3>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={cfg.activo} onChange={(e) => set({ activo: e.target.checked })} className="rounded border-gray-300" />
            <span className="text-sm text-gray-600">{cfg.activo ? 'Activado' : 'Desactivado'}</span>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">1 punto por cada (S/)</label>
            <input
              type="number" min={0.1} step={0.1} value={cfg.solesPorPunto}
              onChange={(e) => set({ solesPorPunto: Number(e.target.value) })}
              className={input}
            />
            <p className="mt-1 text-[11px] text-gray-400">Ej. 1 = 1 punto por cada S/1 gastado.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vigencia de los puntos</label>
            <select
              value={cfg.puntosExpiranMeses ?? ''}
              onChange={(e) => set({ puntosExpiranMeses: e.target.value ? Number(e.target.value) : null })}
              className={input}
            >
              {VENCIMIENTOS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Niveles */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Award size={18} className="text-amber-500" /><h3 className="font-semibold text-gray-900">Niveles</h3></div>
          <button onClick={addNivel} className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"><Plus size={16} /> Agregar</button>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">El nivel se calcula por los puntos <strong>acumulados históricos</strong> (no baja al canjear).</p>
        {cfg.niveles.length === 0 && <p className="text-sm text-gray-400">Sin niveles. Agrega Bronce, Plata, Oro…</p>}
        <div className="space-y-2">
          {cfg.niveles.map((n, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={n.color || '#C9A227'} onChange={(e) => setNivel(i, { color: e.target.value })} className="h-9 w-9 rounded border border-gray-200 p-0.5" title="Color" />
              <input placeholder="Nombre (ej. Oro)" value={n.nombre} onChange={(e) => setNivel(i, { nombre: e.target.value })} className={input + ' flex-1'} />
              <input type="number" min={0} placeholder="Puntos" value={n.puntosMinimos} onChange={(e) => setNivel(i, { puntosMinimos: Number(e.target.value) })} className={input + ' w-28'} title="Puntos mínimos" />
              <button onClick={() => delNivel(i)} className="p-2 text-gray-400 hover:text-red-500" title="Quitar"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      {/* Recompensas */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Gift size={18} className="text-pink-500" /><h3 className="font-semibold text-gray-900">Recompensas</h3></div>
          <button onClick={addRec} className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"><Plus size={16} /> Agregar</button>
        </div>
        {cfg.recompensas.length === 0 && <p className="text-sm text-gray-400">Sin recompensas. Ej. 100 pts → Lavado gratis.</p>}
        <div className="space-y-2">
          {cfg.recompensas.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input placeholder="Recompensa (ej. Lavado gratis)" value={r.nombre} onChange={(e) => setRec(i, { nombre: e.target.value })} className={input + ' flex-1'} />
              <input type="number" min={1} placeholder="Puntos" value={r.puntosRequeridos} onChange={(e) => setRec(i, { puntosRequeridos: Number(e.target.value) })} className={input + ' w-28'} title="Puntos requeridos" />
              <label className="inline-flex items-center gap-1 text-xs text-gray-500 select-none whitespace-nowrap">
                <input type="checkbox" checked={r.activo} onChange={(e) => setRec(i, { activo: e.target.checked })} className="rounded border-gray-300" /> Activa
              </label>
              <button onClick={() => delRec(i)} className="p-2 text-gray-400 hover:text-red-500" title="Quitar"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={guardar} disabled={guardando}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar programa
        </button>
      </div>
    </div>
  )
}
