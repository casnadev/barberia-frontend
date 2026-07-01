import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calculator, CheckCircle2, Loader2, CalendarDays, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cierreCajaService, type PreviewCierre, type CierreCaja as CierreItem } from '@/services/cierreCajaService'
import { CalendarModal } from '@/pages/cliente/CalendarModal'

const METODOS = [
  { key: 'Efectivo', sis: 'montoSistemaEfectivo', real: 'montoRealEfectivo' },
  { key: 'Yape', sis: 'montoSistemaYape', real: 'montoRealYape' },
  { key: 'Plin', sis: 'montoSistemaPlin', real: 'montoRealPlin' },
  { key: 'Otros', sis: 'montoSistemaOtros', real: 'montoRealOtros' },
] as const

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const money = (n?: number) => `S/ ${Number(n || 0).toFixed(2)}`
const fmtFecha = (iso?: string) => {
  try { return new Date(`${(iso || '').slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso || '' }
}

type Reales = { Efectivo: string; Yape: string; Plin: string; Otros: string }

export function CierreCajaPage() {
  const hoy = isoLocal(new Date())
  const [fecha, setFecha] = useState(hoy)
  const [calOpen, setCalOpen] = useState(false)
  const [reales, setReales] = useState<Reales>({ Efectivo: '', Yape: '', Plin: '', Otros: '' })
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  const [hist, setHist] = useState<CierreItem[]>([])

  // Preview del cierre cacheado por [fecha]. Revisitar el mismo día sale al
  // instante. React Query mantiene la misma referencia de datos en revisitas,
  // así que el efecto de abajo NO pisa lo que el usuario haya editado.
  const {
    data: preview = null,
    isLoading: loading,
    refetch,
  } = useQuery<PreviewCierre | null>({
    queryKey: ['caja', 'preview', fecha],
    queryFn: () => cierreCajaService.getPreview(fecha),
  })
  const cargar = () => refetch()

  // Al cambiar de día (nuevo preview), el monto real = lo que dice el sistema.
  useEffect(() => {
    if (preview) {
      setReales({
        Efectivo: preview.montoSistemaEfectivo.toFixed(2),
        Yape: preview.montoSistemaYape.toFixed(2),
        Plin: preview.montoSistemaPlin.toFixed(2),
        Otros: preview.montoSistemaOtros.toFixed(2),
      })
      setObs('')
    }
  }, [preview])

  useEffect(() => { cierreCajaService.listar().then(setHist) }, [])

  const totalReal = useMemo(
    () => METODOS.reduce((s, m) => s + (Number(reales[m.key as keyof Reales]) || 0), 0),
    [reales],
  )
  const diffTotal = totalReal - (preview?.montoSistemaTotal || 0)
  const requiereObs = Math.abs(diffTotal) >= 0.5

  const setReal = (k: keyof Reales, v: string) => setReales(prev => ({ ...prev, [k]: v }))

  const registrar = async () => {
    if (requiereObs && !obs.trim()) return toast.error('Hay diferencia: explica el motivo para registrar el cierre')
    setSaving(true)
    try {
      await cierreCajaService.registrar({
        fechaCierre: fecha,
        montoRealEfectivo: Number(reales.Efectivo) || 0,
        montoRealYape: Number(reales.Yape) || 0,
        montoRealPlin: Number(reales.Plin) || 0,
        montoRealOtros: Number(reales.Otros) || 0,
        observacionDiferencia: obs.trim() || undefined,
      })
      toast.success('Cierre registrado')
      cierreCajaService.listar().then(setHist)
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || 'No se pudo registrar el cierre')
    } finally { setSaving(false) }
  }

  const diffColor = (d: number) => Math.abs(d) < 0.005 ? 'text-emerald-600' : d > 0 ? 'text-amber-600' : 'text-rose-600'

  return (
    <>
      {/* Fecha + resumen */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Calculator width={24} height={24} /></div>
            <div>
              <label className="text-xs text-gray-500 block">Fecha a cerrar</label>
              <button type="button" onClick={() => setCalOpen(true)}
                className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5 hover:border-blue-300 hover:bg-blue-50/40 transition">
                <CalendarDays width={15} height={15} className="text-blue-600" />
                <span className="font-medium text-gray-900">{fmtFecha(fecha)}</span>
              </button>
              <CalendarModal isOpen={calOpen} selectedDate={fecha} allowPast
                onSelectDate={(d) => { if (d <= hoy) setFecha(d) }} onClose={() => setCalOpen(false)} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Ventas aceptadas</p>
            <p className="font-bold text-gray-900">{preview?.cantidadVentas ?? 0} · {money(preview?.montoSistemaTotal)}</p>
            {(preview?.cantidadPendiente ?? 0) > 0 && (
              <p className="text-xs text-amber-600 font-semibold mt-0.5">+ {preview?.cantidadPendiente} pendiente{(preview?.cantidadPendiente ?? 0) > 1 ? 's' : ''} ({money(preview?.montoPendienteAprobacion)})</p>
            )}
          </div>
        </div>
      </div>

      {/* Aviso: ventas pendientes de aprobación (no entran al cierre) */}
      {(preview?.cantidadPendiente ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Tienes {preview?.cantidadPendiente} venta{(preview?.cantidadPendiente ?? 0) > 1 ? 's' : ''} pendiente{(preview?.cantidadPendiente ?? 0) > 1 ? 's' : ''} de aprobación ({money(preview?.montoPendienteAprobacion)})
            </p>
            <p className="text-xs text-amber-700 mt-0.5">No entran en este cierre. Revísalas y apruébalas en <Link to="/admin/ventas" className="underline font-semibold">Ventas</Link> si correspondían a hoy; lo que apruebes después contará en el cierre de su fecha.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {/* Encabezado de columnas */}
          <div className="grid grid-cols-4 gap-2 text-[11px] uppercase tracking-wide text-gray-400 font-semibold px-1 pb-2">
            <span>Método</span><span className="text-right">Sistema</span><span className="text-right">En caja</span><span className="text-right">Diferencia</span>
          </div>

          {METODOS.map(m => {
            const sis = (preview as any)?.[m.sis] || 0
            const real = Number(reales[m.key as keyof Reales]) || 0
            const diff = real - sis
            return (
              <div key={m.key} className="grid grid-cols-4 gap-2 items-center py-2 border-t border-gray-50">
                <span className="text-sm font-medium text-gray-800">{m.key}</span>
                <span className="text-sm text-gray-500 text-right">{money(sis)}</span>
                <input
                  type="number" inputMode="decimal" step="0.01" min={0}
                  value={reales[m.key as keyof Reales]}
                  onChange={e => setReal(m.key as keyof Reales, e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className={`text-sm font-semibold text-right ${diffColor(diff)}`}>{diff > 0 ? '+' : ''}{money(diff)}</span>
              </div>
            )
          })}

          {/* Total */}
          <div className="grid grid-cols-4 gap-2 items-center py-3 border-t-2 border-gray-100 mt-1">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-sm text-gray-600 text-right font-semibold">{money(preview?.montoSistemaTotal)}</span>
            <span className="text-sm text-gray-900 text-right font-bold">{money(totalReal)}</span>
            <span className={`text-sm font-bold text-right ${diffColor(diffTotal)}`}>{diffTotal > 0 ? '+' : ''}{money(diffTotal)}</span>
          </div>

          {/* Observación */}
          <div className="mt-4">
            <label className="text-xs text-gray-500">
              Observación {requiereObs && <span className="text-rose-500 font-semibold">(requerida por la diferencia)</span>}
            </label>
            <textarea
              value={obs} onChange={e => setObs(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <button
            onClick={registrar}
            disabled={saving || (requiereObs && !obs.trim())}
            className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold"
          >
            <CheckCircle2 width={18} height={18} /> {saving ? 'Registrando…' : 'Registrar cierre'}
          </button>
        </div>
      )}

      {/* Historial */}
      {hist.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-700 mt-7 mb-2">Cierres recientes</h2>
          <div className="grid gap-2">
            {hist.slice(0, 8).map(c => (
              <div key={c.idCierre} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{fmtFecha(c.fechaCierre)}</p>
                  <p className="text-xs text-gray-500">{c.cantidadVentas} ventas · por {c.nombreUsuarioCierra}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{money(c.montoRealTotal)}</p>
                  <p className={`text-xs font-semibold ${diffColor(c.diferenciaTotal)}`}>
                    {c.diferenciaTotal > 0 ? '+' : ''}{money(c.diferenciaTotal)} dif.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
