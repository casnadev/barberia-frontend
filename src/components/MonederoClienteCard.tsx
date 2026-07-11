import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Gift, Star, History, Sparkles } from 'lucide-react'
import {
  fidelizacionService,
  type Monedero,
  type RecompensaDisponible,
} from '@/services/fidelizacionService'

const fecha = (s?: string) =>
  s ? new Date(`${String(s).slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : ''

/**
 * Tarjeta de fidelización del cliente para la ficha del Admin/Trabajador:
 * saldo, nivel, próxima recompensa, recompensas canjeables e historial.
 */
export function MonederoClienteCard({ idCliente }: { idCliente: number }) {
  const [monedero, setMonedero] = useState<Monedero | null>(null)
  const [recompensas, setRecompensas] = useState<RecompensaDisponible[]>([])
  const [cargando, setCargando] = useState(true)
  const [canjeando, setCanjeando] = useState<number | null>(null)
  const [verHistorial, setVerHistorial] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([
        fidelizacionService.getMonedero(idCliente),
        fidelizacionService.getRecompensas(idCliente),
      ])
      setMonedero(m)
      setRecompensas(r)
    } catch {
      toast.error('No se pudo cargar la fidelización')
    } finally {
      setCargando(false)
    }
  }, [idCliente])

  useEffect(() => { cargar() }, [cargar])

  const canjear = async (idRecompensa: number, nombre: string) => {
    if (!window.confirm(`¿Canjear "${nombre}"? Se descontarán los puntos.`)) return
    setCanjeando(idRecompensa)
    try {
      const m = await fidelizacionService.canjear(idCliente, idRecompensa)
      setMonedero(m)
      setRecompensas(await fidelizacionService.getRecompensas(idCliente))
      toast.success('Recompensa canjeada')
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || 'No se pudo canjear')
    } finally {
      setCanjeando(null)
    }
  }

  if (cargando) {
    return <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
  }

  // Sin monedero = aún no acumuló puntos (o el programa está inactivo).
  if (!monedero) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
        <Sparkles size={18} className="mx-auto mb-1 opacity-60" />
        Aún no tiene puntos de fidelización.
      </div>
    )
  }

  const nivelColor = monedero.nivelColor || '#6b7280'
  const prox = monedero.proximaRecompensa
  const pct = prox ? Math.min(100, Math.round((monedero.saldoPuntos / prox.puntosRequeridos) * 100)) : 100

  return (
    <div className="space-y-3">
      {/* Tarjeta principal */}
      <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${nivelColor}, #111827)` }}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-medium opacity-90">
            <Star size={13} /> {monedero.nivelNombre || 'Sin nivel'}
          </span>
          <span className="text-[11px] opacity-70">#{monedero.idCliente}</span>
        </div>
        <div className="mt-2">
          <div className="text-3xl font-bold leading-none">{monedero.saldoPuntos}</div>
          <div className="text-xs opacity-80">puntos disponibles</div>
        </div>
        {prox && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] opacity-90 mb-1">
              <span>Próxima: {prox.nombre}</span>
              <span>Faltan {prox.puntosFaltantes}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/25">
              <div className="h-1.5 rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        <div className="mt-2 text-[10px] opacity-60">Acumulado histórico: {monedero.puntosAcumHistorico} pts</div>
      </div>

      {/* Recompensas */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2"><Gift size={14} /> Recompensas</div>
        {recompensas.length === 0 && <p className="text-xs text-gray-400">No hay recompensas configuradas.</p>}
        <div className="space-y-1.5">
          {recompensas.map((r) => (
            <div key={r.idRecompensa} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.nombre}</p>
                <p className="text-[11px] text-gray-400">{r.puntosRequeridos} pts{!r.canjeable && ` · faltan ${r.puntosFaltantes}`}</p>
              </div>
              <button
                onClick={() => canjear(r.idRecompensa, r.nombre)}
                disabled={!r.canjeable || canjeando === r.idRecompensa}
                className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {canjeando === r.idRecompensa ? <Loader2 size={13} className="animate-spin" /> : 'Canjear'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Historial */}
      {monedero.movimientos && monedero.movimientos.length > 0 && (
        <div>
          <button onClick={() => setVerHistorial((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <History size={14} /> Historial de puntos {verHistorial ? '▲' : '▼'}
          </button>
          {verHistorial && (
            <div className="mt-2 space-y-1">
              {monedero.movimientos.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-gray-100 py-1">
                  <span className="text-gray-500">{fecha(m.fecha)} · {m.motivo || m.tipo}</span>
                  <span className={m.puntos >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                    {m.puntos >= 0 ? `+${m.puntos}` : m.puntos}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
