import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CircleNotch, WarningCircle, CheckCircle, PaperPlaneRight, Scales, Clock,
} from '@phosphor-icons/react'
import {
  libroReclamacionesService,
  type HojaReclamacion,
} from '@/services/libroReclamacionesService'
import { mensajeError } from '@/utils/apiError'

/**
 * T8 — BANDEJA DEL LIBRO DE RECLAMACIONES (panel del negocio).
 *
 * Sin esto, el reclamo llegaría a la base de datos y NADIE LO VERÍA. Y no responder
 * en plazo es una infracción independiente de no tener libro: se sancionan por
 * separado (Ley 29571). Así que un libro sin bandeja es peor que no tenerlo — le
 * crea al negocio una obligación que no puede cumplir.
 *
 * El contador de días es lo importante de esta pantalla: 15 días HÁBILES desde la
 * reclamación. Aquí se ve cuánto queda, y en rojo cuando aprieta.
 */

/** Días de calendario que faltan. Negativo = plazo VENCIDO. */
const diasRestantes = (limiteIso: string): number => {
  const limite = new Date(limiteIso)
  if (Number.isNaN(limite.getTime())) return 0
  const hoy = new Date()
  const d0 = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const d1 = Date.UTC(limite.getFullYear(), limite.getMonth(), limite.getDate())
  return Math.round((d1 - d0) / 86_400_000)
}

const fecha = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-PE')
}

export function LibroReclamacionesPanel() {
  const [hojas, setHojas] = useState<HojaReclamacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierta, setAbierta] = useState<number | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = () =>
    libroReclamacionesService.listar()
      .then(setHojas)
      .catch(() => toast.error('No se pudo cargar el libro de reclamaciones'))
      .finally(() => setCargando(false))

  useEffect(() => { cargar() }, [])

  const pendientes = useMemo(
    () => hojas.filter((h) => h.estado === 'Pendiente').length,
    [hojas],
  )

  // Las que ya vencieron el plazo. Es LA cifra que importa: cada una es una
  // infracción sancionable.
  const vencidas = useMemo(
    () => hojas.filter((h) => h.estado === 'Pendiente' && diasRestantes(h.fechaLimiteRespuesta) < 0).length,
    [hojas],
  )

  const responder = async (idHoja: number) => {
    const texto = respuesta.trim()
    if (texto.length < 10) { toast.error('Escribe una respuesta un poco más completa.'); return }

    setEnviando(true)
    try {
      await libroReclamacionesService.responder(idHoja, texto)
      toast.success('Respuesta enviada al consumidor por correo.')
      setAbierta(null)
      setRespuesta('')
      await cargar()
    } catch (e) {
      toast.error(mensajeError(e, 'No se pudo enviar la respuesta.'))
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return (
      <div className="grid place-items-center py-10">
        <CircleNotch size={24} className="animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Cabecera legal. Que sepa exactamente en qué está metido. ── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
        <div className="flex items-start gap-2">
          <Scales size={16} weight="fill" className="mt-0.5 shrink-0 text-gray-500" />
          <p className="text-xs leading-relaxed text-gray-600">
            <strong className="text-gray-800">Este libro es tuyo, no de barber.pe.</strong>{' '}
            Frente a Indecopi el proveedor eres tú: tú prestas el servicio y tú cobras.
            Tienes <strong>15 días hábiles</strong> para responder cada reclamo (Ley 29571).
            No responder es una infracción <em>aparte</em> de no tener libro — se sancionan
            por separado.
          </p>
        </div>
      </div>

      {vencidas > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-rose-600" />
          <p className="text-xs leading-relaxed text-rose-800">
            <strong>{vencidas} {vencidas === 1 ? 'reclamo ha' : 'reclamos han'} pasado el
            plazo legal.</strong>{' '}
            Responde cuanto antes: el plazo vencido no se recupera, pero responder tarde es
            mejor que no responder.
          </p>
        </div>
      )}

      {hojas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <CheckCircle size={26} weight="fill" className="mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-medium text-gray-700">Sin reclamos.</p>
          <p className="mt-1 text-xs text-gray-400">
            Tu Libro de Reclamaciones está publicado en tu sitio, como exige la ley.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            {pendientes} pendiente(s) de {hojas.length}.
          </p>

          <div className="space-y-2">
            {hojas.map((h) => {
              const dias = diasRestantes(h.fechaLimiteRespuesta)
              const vencido = h.estado === 'Pendiente' && dias < 0
              const urgente = h.estado === 'Pendiente' && dias >= 0 && dias <= 3

              return (
                <div
                  key={h.idHoja}
                  className={`rounded-xl border bg-white p-4 ${
                    vencido ? 'border-rose-300' : urgente ? 'border-amber-300' : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-900">
                          {h.numero}
                        </span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          h.tipo === 'Queja'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {h.tipo}
                        </span>
                        {h.estado === 'Respondida' ? (
                          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Respondida
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            vencido
                              ? 'bg-rose-100 text-rose-700'
                              : urgente
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Clock size={10} weight="fill" />
                            {vencido
                              ? `Vencido hace ${Math.abs(dias)} d`
                              : dias === 0
                                ? 'Vence HOY'
                                : `Quedan ${dias} d`}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {h.consumidorNombre}{' '}
                        <span className="font-normal text-gray-400">· {h.consumidorDoc}</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {fecha(h.fechaCreacion)} · {h.consumidorCorreo}
                        {h.consumidorTelefono && ` · ${h.consumidorTelefono}`}
                      </p>
                    </div>

                    {h.estado === 'Pendiente' && (
                      <button
                        onClick={() => {
                          setAbierta(abierta === h.idHoja ? null : h.idHoja)
                          setRespuesta('')
                        }}
                        className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                      >
                        {abierta === h.idHoja ? 'Cancelar' : 'Responder'}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-xs">
                    <p className="text-gray-500">
                      <strong className="text-gray-700">Sobre:</strong> {h.descripcion}
                      {h.monto != null && <> · <strong>S/ {h.monto.toFixed(2)}</strong></>}
                    </p>
                    <p className="whitespace-pre-line text-gray-700">{h.detalle}</p>
                    {h.pedido && (
                      <p className="text-gray-500">
                        <strong className="text-gray-700">Pide:</strong> {h.pedido}
                      </p>
                    )}
                  </div>

                  {h.respuesta && (
                    <div className="mt-3 rounded-lg bg-emerald-50/60 p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        Tu respuesta · {h.fechaRespuesta && fecha(h.fechaRespuesta)}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-xs text-gray-700">{h.respuesta}</p>
                    </div>
                  )}

                  {abierta === h.idHoja && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <textarea
                        autoFocus
                        rows={4}
                        value={respuesta}
                        onChange={(e) => setRespuesta(e.target.value)}
                        placeholder="Explica qué vas a hacer al respecto. Esto se le enviará por correo."
                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-gray-400"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-gray-400">
                          Se envía a <strong>{h.consumidorCorreo}</strong>. La ley exige
                          comunicar la respuesta por escrito.
                        </p>
                        <button
                          onClick={() => responder(h.idHoja)}
                          disabled={enviando}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {enviando
                            ? <CircleNotch size={13} className="animate-spin" />
                            : <PaperPlaneRight size={13} weight="fill" />}
                          Enviar respuesta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default LibroReclamacionesPanel
