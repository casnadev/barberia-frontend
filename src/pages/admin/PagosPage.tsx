import { useEffect, useMemo, useState } from 'react'
import { Wallet, X, User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { pagosService, type ResumenComisiones } from '@/services/pagosService'

const METODOS = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia', 'Otro']
const money = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`

export function PagosPage() {
  const [lista, setLista] = useState<ResumenComisiones[]>([])
  const [loading, setLoading] = useState(true)
  const [pagar, setPagar] = useState<ResumenComisiones | null>(null)

  const cargar = async () => {
    setLoading(true)
    try { setLista(await pagosService.getResumenComisiones()) }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [])

  const totalPendiente = useMemo(
    () => lista.reduce((s, t) => s + (t.comisionesTotalPendiente || 0), 0),
    [lista],
  )

  return (
    <>
      {/* Total pendiente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Pendiente total por pagar</p>
          <p className="text-3xl font-extrabold text-rose-600 mt-1">{money(totalPendiente)}</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
          <Wallet width={26} height={26} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <p className="text-gray-500 text-sm py-10 text-center">No hay comisiones registradas todavía.</p>
      ) : (
        <div className="grid gap-3">
          {lista.map(t => {
            const pendiente = t.comisionesTotalPendiente || 0
            return (
              <div key={t.idTrabajador} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                  <User width={20} height={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{t.nombreTrabajador}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Calculado {money(t.comisionesTotalCalculado)} · Pagado {money(t.comisionesTotalPagado)}
                    {t.cantidadDetallesPendientes > 0 && ` · ${t.cantidadDetallesPendientes} servicio${t.cantidadDetallesPendientes === 1 ? '' : 's'} sin liquidar`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Pendiente</p>
                  <p className={`font-bold ${pendiente > 0.005 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(pendiente)}</p>
                </div>
                <button
                  onClick={() => setPagar(t)}
                  disabled={pendiente <= 0.005}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-default text-white rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Pagar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {pagar && (
        <PagoModal
          trabajador={pagar}
          onClose={() => setPagar(null)}
          onDone={async () => { setPagar(null); await cargar() }}
        />
      )}
    </>
  )
}

function PagoModal({ trabajador, onClose, onDone }: { trabajador: ResumenComisiones; onClose: () => void; onDone: () => void }) {
  const pendiente = trabajador.comisionesTotalPendiente || 0
  const [monto, setMonto] = useState(pendiente.toFixed(2))
  const [metodo, setMetodo] = useState('Efectivo')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)

  const field = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'

  const guardar = async () => {
    const n = Number(monto)
    if (!n || n <= 0) return toast.error('Ingresa un monto válido')
    if (n - pendiente > 0.005) return toast.error(`El monto no puede superar el pendiente (${money(pendiente)})`)
    setSaving(true)
    try {
      await pagosService.registrarPago({ idTrabajador: trabajador.idTrabajador, montoPagado: n, metodoPago: metodo, observacion: obs.trim() || undefined })
      toast.success('Pago registrado')
      onDone()
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || 'No se pudo registrar el pago')
    } finally { setSaving(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Pagar a {trabajador.nombreTrabajador}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X width={20} height={20} /></button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600">
          Pendiente actual: <strong className="text-rose-600">{money(pendiente)}</strong>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Monto a pagar (S/)</label>
            <input className={field} value={monto} onChange={e => setMonto(e.target.value)} inputMode="decimal" type="number" min={0} max={pendiente} step="0.01" />
            <button onClick={() => setMonto(pendiente.toFixed(2))} className="text-xs text-blue-600 mt-1">Pagar todo el pendiente</button>
          </div>
          <div>
            <label className="text-xs text-gray-500">Método</label>
            <select className={field} value={metodo} onChange={e => setMetodo(e.target.value)}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Observación (opcional)</label>
            <input className={field} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ej: liquidación semana 1" />
          </div>
          <button
            onClick={guardar}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold"
          >
            {saving ? 'Registrando…' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}
