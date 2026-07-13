import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  X, CircleNotch, WarningCircle, ArrowsMerge, CheckCircle, Star, Phone, Envelope, Prohibit,
} from '@phosphor-icons/react'
import { duplicadosService, type GrupoDuplicado, type CandidatoDuplicado } from '@/services/clientesService'

/**
 * T4 — POSIBLES DUPLICADOS
 *
 * El sistema SUGIERE. El ADMIN decide. **Nunca se fusiona solo.**
 *
 * Y no es prudencia excesiva: es que NO SE PUEDE SABER.
 *
 *     Juan Pérez · 999111222 · juan@gmail
 *     Juan Pérez · 999333444 · juan@gmail
 *
 * ¿La misma persona? ¿Dos hermanos que comparten el correo de casa? ¿Un teléfono
 * reciclado? ¿Un dedazo del mostrador? Un script no lo puede saber. Y fusionar
 * movería PUNTOS —que valen dinero— entre dos personas distintas. Eso no se
 * deshace: para cuando te des cuenta, ya se habrán canjeado.
 *
 * Por eso esta pantalla enseña, de cada ficha, EXACTAMENTE lo que está en juego
 * (puntos, ventas, reservas, tarjeta) antes de que el Admin elija. Y le obliga a
 * elegir cuál sobrevive: no hay "fusionar" a ciegas.
 */
export function DuplicadosModal({ onClose, onFusionado }: {
  onClose: () => void
  onFusionado: () => void
}) {
  const [grupos, setGrupos] = useState<GrupoDuplicado[]>([])
  const [cargando, setCargando] = useState(true)
  const [fusionando, setFusionando] = useState(false)
  /** Ficha elegida como principal, por grupo. */
  const [elegido, setElegido] = useState<Record<number, number>>({})

  const cargar = async () => {
    setCargando(true)
    try {
      setGrupos(await duplicadosService.listar())
    } catch {
      toast.error('No se pudieron cargar los duplicados')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const fusionar = async (gi: number, g: GrupoDuplicado) => {
    const idPrincipal = elegido[gi]
    if (!idPrincipal) { toast.error('Elige cuál ficha se queda'); return }

    const otras = g.fichas.filter((f) => f.idCliente !== idPrincipal)
    const puntos = otras.reduce((a, f) => a + f.saldoPuntos, 0)

    const aviso = puntos > 0
      ? `\n\nSe sumarán ${puntos} puntos a la ficha principal.`
      : ''

    if (!window.confirm(
      `¿Fusionar ${otras.length} ficha${otras.length > 1 ? 's' : ''} en la principal?` +
      `${aviso}\n\nEsto NO se puede deshacer.`
    )) return

    setFusionando(true)
    try {
      for (const f of otras) {
        await duplicadosService.fusionar(idPrincipal, f.idCliente)
      }
      toast.success('Fichas fusionadas')
      onFusionado()
      await cargar()
    } catch (e: any) {
      toast.error(e?.response?.data?.mensaje || 'No se pudo fusionar')
    } finally {
      setFusionando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <ArrowsMerge size={20} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight text-gray-900">Posibles duplicados</h3>
            <p className="text-xs leading-tight text-gray-400">Tú decides. El sistema solo sugiere.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cargando ? (
            <div className="grid place-items-center py-16 text-gray-300">
              <CircleNotch size={26} className="animate-spin" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle size={40} weight="fill" className="mx-auto mb-3 text-emerald-500" />
              <p className="font-semibold text-gray-800">No hay duplicados</p>
              <p className="mt-1 text-sm text-gray-500">Tu base de clientes está limpia.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                <WarningCircle size={16} weight="fill" className="mt-px shrink-0 text-amber-600" />
                <span>
                  <strong>Fusionar no se puede deshacer.</strong> Los puntos de las fichas
                  descartadas se suman a la principal. Si resultan ser personas distintas,
                  los puntos ya habrán cambiado de dueño. Revisa bien antes de decidir.
                </span>
              </p>

              <div className="space-y-4">
                {grupos.map((g, gi) => (
                  <div key={gi} className="rounded-2xl border border-gray-200 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{g.motivo}</span>
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{g.coincidencia}</code>
                      {g.riesgo === 'Alto' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                          <WarningCircle size={11} weight="fill" /> Riesgo alto
                        </span>
                      )}
                    </div>

                    {g.riesgo === 'Alto' && (
                      <p className="mb-3 text-[11px] leading-relaxed text-rose-700">
                        Las dos fichas tienen puntos o ventas. Si no son la misma persona,
                        esta fusión le regala los puntos de una al otro.
                      </p>
                    )}

                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      ¿Cuál se queda?
                    </p>

                    <div className="space-y-2">
                      {g.fichas.map((f) => (
                        <FichaRow
                          key={f.idCliente}
                          f={f}
                          seleccionada={elegido[gi] === f.idCliente}
                          onSelect={() => setElegido((e) => ({ ...e, [gi]: f.idCliente }))}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => fusionar(gi, g)}
                      disabled={fusionando || !elegido[gi]}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {fusionando ? <CircleNotch size={15} className="animate-spin" /> : <ArrowsMerge size={15} weight="bold" />}
                      Fusionar en la ficha elegida
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Una ficha candidata, con TODO lo que está en juego bien visible. */
function FichaRow({ f, seleccionada, onSelect }: {
  f: CandidatoDuplicado
  seleccionada: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
        seleccionada
          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/25'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
        seleccionada ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
      }`}>
        {seleccionada && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-gray-900">
            {f.nombreCompleto || 'Sin nombre'}
          </span>
          <span className="text-[10px] text-gray-400">#{f.idCliente}</span>
          {f.dadoDeBaja && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
              <Prohibit size={9} weight="fill" /> Dado de baja
            </span>
          )}
          {f.tieneTarjetaWallet && (
            <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
              Tarjeta activa
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
          {f.telefono && <span className="inline-flex items-center gap-1"><Phone size={10} weight="fill" /> {f.telefono}</span>}
          {f.correo && <span className="inline-flex items-center gap-1 truncate"><Envelope size={10} weight="fill" /> {f.correo}</span>}
        </div>

        {/* Lo que se PIERDE si esta ficha NO es la elegida. Es lo que hay que mirar. */}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          {f.saldoPuntos > 0 && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
              <Star size={10} weight="fill" /> {f.saldoPuntos} pts
            </span>
          )}
          <span className="text-gray-400">{f.reservas} reservas</span>
          <span className="text-gray-400">{f.ventas} ventas</span>
        </div>
      </div>
    </button>
  )
}
