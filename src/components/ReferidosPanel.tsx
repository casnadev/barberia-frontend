import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Gift, Save, Users, CheckCircle2, Clock, Ban } from 'lucide-react'
import { referidosService, type ConfiguracionReferidos, type Referido } from '@/services/referidosService'

/* Metadatos de estado del referido */
const ESTADOS: Record<string, { label: string; bg: string; fg: string; icon: typeof Clock }> = {
  Pendiente:  { label: 'Pendiente',  bg: '#fef3c7', fg: '#92400e', icon: Clock },
  Confirmado: { label: 'Confirmado', bg: '#dcfce7', fg: '#166534', icon: CheckCircle2 },
  Anulado:    { label: 'Anulado',    bg: '#f3f4f6', fg: '#374151', icon: Ban },
}
const FILTROS: { key: string; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'Pendiente', label: 'Pendientes' },
  { key: 'Confirmado', label: 'Confirmados' },
  { key: 'Anulado', label: 'Anulados' },
]

const soles = (n: number) => `S/ ${(n ?? 0).toFixed(2)}`
const fecha = (s?: string | null) => (s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

export function ReferidosPanel() {
  // Config
  const [cfg, setCfg] = useState<ConfiguracionReferidos>({ descuentoNuevaPEN: 0, descuentoReferidorPEN: 0, activo: false, maxReferidosPorEmpresa: 0 })
  const [cargandoCfg, setCargandoCfg] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Lista
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    referidosService.getConfig()
      .then((c) => c && setCfg(c))
      .catch(() => toast.error('No se pudo cargar la configuración'))
      .finally(() => setCargandoCfg(false))
  }, [])

  useEffect(() => {
    setCargandoLista(true)
    referidosService.listar(filtro || undefined)
      .then(setReferidos)
      .catch(() => toast.error('No se pudo cargar la lista de referidos'))
      .finally(() => setCargandoLista(false))
  }, [filtro])

  const guardar = async () => {
    setGuardando(true)
    try {
      await referidosService.guardarConfig({
        descuentoNuevaPEN: Math.max(0, Number(cfg.descuentoNuevaPEN) || 0),
        descuentoReferidorPEN: Math.max(0, Number(cfg.descuentoReferidorPEN) || 0),
        activo: cfg.activo,
        maxReferidosPorEmpresa: Math.max(0, Math.trunc(Number(cfg.maxReferidosPorEmpresa) || 0)),
      })
      toast.success('Configuración guardada')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ============ CONFIGURACIÓN ============ */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Gift className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Programa de referidos</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Una barbería recomienda a otra con su código. Cuando la nueva paga su plan, ambas reciben un descuento.
        </p>

        {cargandoCfg ? (
          <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <>
            {/* Toggle activo */}
            <label className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50 border border-gray-200 mb-4 cursor-pointer">
              <div>
                <p className="font-semibold text-gray-800">Promo activa</p>
                <p className="text-xs text-gray-500">Si está apagada, los descuentos no se aplican (los referidos igual se registran).</p>
              </div>
              <button
                type="button"
                onClick={() => setCfg({ ...cfg, activo: !cfg.activo })}
                className={`relative w-12 h-7 rounded-full transition shrink-0 ${cfg.activo ? 'bg-emerald-500' : 'bg-gray-300'}`}
                aria-pressed={cfg.activo}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${cfg.activo ? 'translate-x-5' : ''}`} />
              </button>
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <Campo
                label="Descuento empresa NUEVA (S/)"
                hint="Lo recibe la que se da de alta con código."
                value={cfg.descuentoNuevaPEN}
                onChange={(v) => setCfg({ ...cfg, descuentoNuevaPEN: v })}
              />
              <Campo
                label="Crédito empresa que REFIERE (S/)"
                hint="Saldo que gana, a usar en su próxima renovación."
                value={cfg.descuentoReferidorPEN}
                onChange={(v) => setCfg({ ...cfg, descuentoReferidorPEN: v })}
              />
              <Campo
                label="Tope de referidos por empresa"
                hint="0 = sin tope."
                value={cfg.maxReferidosPorEmpresa}
                step={1}
                onChange={(v) => setCfg({ ...cfg, maxReferidosPorEmpresa: v })}
              />
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={guardar}
                disabled={guardando}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition"
              >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </>
        )}
      </section>

      {/* ============ LISTA DE REFERIDOS ============ */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Referidos</h2>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: 'none' }}>
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`shrink-0 text-sm font-semibold px-3.5 py-1.5 rounded-full border transition ${
                filtro === f.key ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {cargandoLista ? (
          <div className="flex items-center justify-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : referidos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Gift className="w-9 h-9 mx-auto mb-2 text-gray-300" />
            <p>No hay referidos {filtro ? 'en este estado' : 'todavía'}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referidos.map((r) => {
              const est = ESTADOS[r.estado] ?? ESTADOS.Pendiente
              const EstIcon = est.icon
              return (
                <div key={r.idReferido} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {r.nombreReferidora || `Empresa #${r.idEmpresaReferidora}`}
                      <span className="text-gray-400 font-normal"> &rarr; </span>
                      {r.nombreReferida || `Empresa #${r.idEmpresaReferida}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Código <span className="font-mono font-semibold">{r.codigoUsado}</span> · Registrado {fecha(r.fechaRegistro)}
                      {r.fechaConfirmacion ? ` · Confirmado ${fecha(r.fechaConfirmacion)}` : ''}
                    </p>
                  </div>

                  <div className="text-xs text-gray-600 sm:text-right shrink-0">
                    <div>Nueva: <b>{soles(r.descuentoNuevaAplicadoPEN)}</b></div>
                    <div>Refiere: <b>{soles(r.descuentoReferidorAplicadoPEN)}</b></div>
                  </div>

                  <span
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 self-start sm:self-auto"
                    style={{ background: est.bg, color: est.fg }}
                  >
                    <EstIcon className="w-3.5 h-3.5" /> {est.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

/* Campo numérico reutilizable */
function Campo({ label, hint, value, onChange, step = 0.5 }: {
  label: string; hint?: string; value: number; onChange: (v: number) => void; step?: number
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  )
}
