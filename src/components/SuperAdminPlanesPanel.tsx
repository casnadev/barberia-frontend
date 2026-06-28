import { useEffect, useState, type ReactNode } from 'react'
import { superAdminPlanesService, type PlanAdmin, type PlanAdminUpsert } from '@/services/superAdminPlanesService'

const vacio: PlanAdminUpsert = {
  nombre: '', descripcion: '', codigoPlan: '', activo: true, esPopular: false, orden: 0,
  trialDuracionDias: 14, precioMensual: 0, moneda: 'PEN', stripePriceId: '', stripeProductId: '',
  precioAnual: 0,
  maxWhatsAppMes: 50, maxTrabajadores: 3, maxSedes: 1, maxEmailMes: 500,
}

const soles = (n: number, m: string) => `${m} ${Number(n || 0).toFixed(2)}`
const lim = (n: number) => (n < 0 ? '∞' : String(n))

export function SuperAdminPlanesPanel() {
  const [planes, setPlanes] = useState<PlanAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<PlanAdminUpsert | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const cargar = async () => {
    setLoading(true); setError(null)
    try { setPlanes(await superAdminPlanesService.listar()) }
    catch { setError('No se pudieron cargar los planes.') }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => { setEditId(null); setForm({ ...vacio }); setMsg(null) }
  const abrirEditar = (p: PlanAdmin) => {
    setEditId(p.idPlan); setMsg(null)
    setForm({
      nombre: p.nombre, descripcion: p.descripcion ?? '', codigoPlan: p.codigoPlan ?? '',
      activo: p.activo, esPopular: p.esPopular, orden: p.orden, trialDuracionDias: p.trialDuracionDias,
      precioMensual: p.precioMensual, moneda: p.moneda, stripePriceId: p.stripePriceId ?? '',
      stripeProductId: p.stripeProductId ?? '', maxWhatsAppMes: p.maxWhatsAppMes,
      precioAnual: p.precioAnual ?? 0,
      maxTrabajadores: p.maxTrabajadores, maxSedes: p.maxSedes, maxEmailMes: p.maxEmailMes ?? 500,
    })
  }

  const guardar = async () => {
    if (!form) return
    if (!form.nombre.trim()) { setMsg('El nombre es obligatorio.'); return }
    setSaving(true); setMsg(null)
    try {
      if (editId) await superAdminPlanesService.actualizar(editId, form)
      else await superAdminPlanesService.crear(form)
      setForm(null); setEditId(null)
      await cargar()
    } catch (e: any) {
      setMsg(e?.response?.data?.mensaje ?? 'No se pudo guardar.')
    } finally { setSaving(false) }
  }

  const toggle = async (p: PlanAdmin) => {
    try { await superAdminPlanesService.cambiarEstado(p.idPlan, !p.activo); await cargar() }
    catch { /* noop */ }
  }

  if (loading) return <p className="text-gray-500 py-10 text-center">Cargando planes…</p>
  if (error) return <p className="text-red-600 py-10 text-center">{error}</p>

  const set = (patch: Partial<PlanAdminUpsert>) => setForm(f => (f ? { ...f, ...patch } : f))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Planes</h2>
          <p className="text-sm text-gray-500">Administra precios, límites, días de prueba y los IDs de Stripe — sin tocar la base de datos.</p>
        </div>
        <button onClick={abrirNuevo} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">+ Nuevo plan</button>
      </div>

      {/* Formulario */}
      {form && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editId ? 'Editar plan' : 'Nuevo plan'}</h3>
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
            Los IDs de Stripe se crean y actualizan <b>automáticamente</b> al guardar (cuando el backend usa <code>Proveedor=Stripe</code>). No necesitas entrar al dashboard de Stripe. Si cambias el precio, se genera un Price nuevo y se archiva el anterior (los clientes actuales mantienen su precio).
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Campo label="Nombre"><input className={inp} value={form.nombre} onChange={e => set({ nombre: e.target.value })} /></Campo>
            <Campo label="Código (opcional)"><input className={inp} value={form.codigoPlan ?? ''} onChange={e => set({ codigoPlan: e.target.value })} placeholder="pro / multisede" /></Campo>
            <Campo label="Orden"><NumInput value={form.orden} onChange={n => set({ orden: n })} /></Campo>
            <Campo label="Descripción"><input className={inp} value={form.descripcion ?? ''} onChange={e => set({ descripcion: e.target.value })} /></Campo>
            <Campo label="Precio mensual"><NumInput value={form.precioMensual} onChange={n => set({ precioMensual: n })} step="0.01" /></Campo>
            <Campo label="Precio anual (0 = sin anual)"><NumInput value={form.precioAnual} onChange={n => set({ precioAnual: n })} step="0.01" /></Campo>
            <Campo label="Moneda"><input className={inp} value={form.moneda} onChange={e => set({ moneda: e.target.value.toUpperCase() })} /></Campo>
            <Campo label="Días de prueba"><NumInput value={form.trialDuracionDias} onChange={n => set({ trialDuracionDias: n })} /></Campo>
            <Campo label="Máx. WhatsApp/mes (-1 = ∞)"><NumInput value={form.maxWhatsAppMes} onChange={n => set({ maxWhatsAppMes: n })} /></Campo>
            <Campo label="Máx. correos campaña/mes (-1 = ∞)"><NumInput value={form.maxEmailMes} onChange={n => set({ maxEmailMes: n })} /></Campo>
            <Campo label="Máx. trabajadores (-1 = ∞)"><NumInput value={form.maxTrabajadores} onChange={n => set({ maxTrabajadores: n })} /></Campo>
            <Campo label="Máx. sedes (-1 = ∞)"><NumInput value={form.maxSedes} onChange={n => set({ maxSedes: n })} /></Campo>
            <Campo label="Stripe Price ID (automático)"><input className={inp + ' bg-gray-100 text-gray-500'} value={form.stripePriceId || '— se genera al guardar —'} readOnly /></Campo>
            <Campo label="Stripe Product ID (automático)"><input className={inp + ' bg-gray-100 text-gray-500'} value={form.stripeProductId || '— se genera al guardar —'} readOnly /></Campo>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.activo} onChange={e => set({ activo: e.target.checked })} /> Activo</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.esPopular} onChange={e => set({ esPopular: e.target.checked })} /> Popular</label>
          </div>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <div className="flex gap-2">
            <button onClick={guardar} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
            <button onClick={() => { setForm(null); setEditId(null) }} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700">Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabla (desktop) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
              <th className="py-2.5 px-3 font-medium">Plan</th>
              <th className="py-2.5 px-3 font-medium">Precio</th>
              <th className="py-2.5 px-3 font-medium">Anual</th>
              <th className="py-2.5 px-3 font-medium">Trial</th>
              <th className="py-2.5 px-3 font-medium">WhatsApp</th>
              <th className="py-2.5 px-3 font-medium">Correos</th>
              <th className="py-2.5 px-3 font-medium">Trab.</th>
              <th className="py-2.5 px-3 font-medium">Sedes</th>
              <th className="py-2.5 px-3 font-medium">Stripe</th>
              <th className="py-2.5 px-3 font-medium">Estado</th>
              <th className="py-2.5 px-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {planes.map(p => (
              <tr key={p.idPlan} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 font-medium text-gray-800">{p.nombre}{p.esPopular && <span className="ml-1 text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded-full">Popular</span>}</td>
                <td className="py-2 px-3 text-gray-700">{soles(p.precioMensual, p.moneda)}</td>
                <td className="py-2 px-3 text-gray-700">{p.precioAnual > 0 ? soles(p.precioAnual, p.moneda) : <span className="text-gray-400">—</span>}</td>
                <td className="py-2 px-3 text-gray-600">{p.trialDuracionDias} d</td>
                <td className="py-2 px-3 text-gray-700">{lim(p.maxWhatsAppMes)}</td>
                <td className="py-2 px-3 text-gray-700">{lim(p.maxEmailMes)}</td>
                <td className="py-2 px-3 text-gray-700">{lim(p.maxTrabajadores)}</td>
                <td className="py-2 px-3 text-gray-700">{lim(p.maxSedes)}</td>
                <td className="py-2 px-3">{p.stripePriceId ? <span className="text-emerald-600">✅</span> : <span className="text-gray-400">—</span>}</td>
                <td className="py-2 px-3">
                  <button onClick={() => toggle(p)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="py-2 px-3">
                  <button onClick={() => abrirEditar(p)} className="text-blue-600 hover:underline">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (móvil) */}
      <div className="grid grid-cols-1 gap-3 sm:hidden">
        {planes.map(p => (
          <div key={p.idPlan} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900">
                {p.nombre}
                {p.esPopular && <span className="ml-1.5 text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded-full">Popular</span>}
              </div>
              <button onClick={() => toggle(p)} className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                {p.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-sm">
              <div className="text-gray-500">Mensual</div><div className="text-gray-800 text-right font-medium">{soles(p.precioMensual, p.moneda)}</div>
              <div className="text-gray-500">Anual</div><div className="text-gray-800 text-right font-medium">{p.precioAnual > 0 ? soles(p.precioAnual, p.moneda) : '—'}</div>
              <div className="text-gray-500">Trial</div><div className="text-gray-800 text-right">{p.trialDuracionDias} d</div>
              <div className="text-gray-500">WhatsApp</div><div className="text-gray-800 text-right">{lim(p.maxWhatsAppMes)}</div>
              <div className="text-gray-500">Correos</div><div className="text-gray-800 text-right">{lim(p.maxEmailMes)}</div>
              <div className="text-gray-500">Trab. / Sedes</div><div className="text-gray-800 text-right">{lim(p.maxTrabajadores)} / {lim(p.maxSedes)}</div>
              <div className="text-gray-500">Stripe</div><div className="text-right">{p.stripePriceId ? <span className="text-emerald-600">✅</span> : <span className="text-gray-400">—</span>}</div>
            </div>
            <button onClick={() => abrirEditar(p)} className="mt-3 w-full py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-semibold hover:bg-blue-100">Editar</button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">Tip: usa <b>-1</b> en un límite para “ilimitado”. El plan gratis/trial no necesita Stripe Price ID.</p>
    </div>
  )
}

const inp = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm'
function Campo({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="block text-xs text-gray-500 mb-1">{label}</span>{children}</label>
}

/**
 * Input numérico que SÍ deja borrar el campo mientras escribes (sin que reaparezca
 * el 0). Mantiene un texto local; al perder foco o quedar vacío, normaliza a un
 * número válido y avisa al padre. step="any" permite decimales si se pide.
 */
function NumInput({ value, onChange, step }: { value: number; onChange: (n: number) => void; step?: string }) {
  const [txt, setTxt] = useState<string>(String(value ?? 0))
  useEffect(() => { setTxt(String(value ?? 0)) }, [value])

  return (
    <input
      type="number"
      step={step}
      className={inp}
      value={txt}
      onChange={(e) => {
        const v = e.target.value
        setTxt(v)                       // deja el campo como lo escribe (incluso vacío)
        if (v === '' || v === '-') return // vacío temporal: no fuerza número todavía
        const n = Number(v)
        if (!Number.isNaN(n)) onChange(n)
      }}
      onBlur={() => {
        // Al salir, si quedó vacío o inválido, normaliza a 0 y refleja.
        if (txt === '' || txt === '-' || Number.isNaN(Number(txt))) { setTxt('0'); onChange(0) }
      }}
    />
  )
}
