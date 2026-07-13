import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  CircleNotch, Star, Gift, WarningCircle, ClockCounterClockwise, Lock,
} from '@phosphor-icons/react'
import { buildImageUrl } from '@/services/apiClient'
import { inscripcionService, type MonederoPublico } from '@/services/inscripcionService'

const fechaCorta = (s?: string) => {
  if (!s) return ''
  try {
    return new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  } catch { return '' }
}

/**
 * MONEDERO WEB DEL CLIENTE — barber.pe/monedero/:codigo   (PÚBLICO, sin sesión)
 *
 * Es LA RED DE SEGURIDAD del programa: funciona en CUALQUIER teléfono, sin app y
 * sin Google Wallet. Cubre también a los usuarios de iPhone si Wallet no les
 * funciona. Si Google se cae, esto sigue igual — porque la fuente de verdad
 * SIEMPRE es el ledger de Barber.pe; Wallet es solo un espejo.
 *
 * Aquí vive el QR del CLIENTE: el que escanea el barbero en cada visita para
 * identificarlo. (El otro QR, el del cartel del local, es para inscribirse y solo
 * se escanea una vez.)
 */
export function MonederoPublicoPage() {
  const { codigo } = useParams()
  const [m, setM] = useState<MonederoPublico | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!codigo) { setCargando(false); return }
    inscripcionService.getMonedero(codigo)
      .then(setM)
      .finally(() => setCargando(false))
  }, [codigo])

  if (cargando) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50">
        <CircleNotch size={28} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (!m) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50 p-6 text-center">
        <div>
          <WarningCircle size={40} weight="fill" className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">Este monedero no existe</p>
          <p className="mt-1 text-sm text-gray-500">Revisa el enlace o vuelve a inscribirte en el local.</p>
        </div>
      </div>
    )
  }

  const color = m.nivelColor || m.color || '#111827'
  const prox = m.proximaRecompensa
  const pct = prox
    ? Math.min(100, Math.round((m.saldoPuntos / Math.max(1, prox.puntosRequeridos)) * 100))
    : 100

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-sm space-y-4">

        {/* ── LA TARJETA ── */}
        <div
          className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${color}, #111827)` }}
        >
          <div className="flex items-center gap-2">
            {m.logo ? (
              <img src={buildImageUrl(m.logo)} alt="" className="h-9 w-9 rounded-lg bg-white/90 object-contain p-0.5" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/20 text-sm font-bold">
                {(m.nombreNegocio || 'B').slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold uppercase leading-tight tracking-wide">{m.nombreNegocio}</p>
              <p className="flex items-center gap-1 text-[10px] opacity-80">
                <Star size={10} weight="fill" /> Programa de fidelización
              </p>
            </div>
          </div>

          <div className="mt-5">
            {m.nombreCliente && (
              <p className="truncate text-xs opacity-80">{m.nombreCliente}</p>
            )}
            <p className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
              Nivel {m.nivelNombre || '—'}
            </p>
            <p className="text-4xl font-bold leading-none">{m.saldoPuntos}</p>
            <p className="text-xs opacity-80">puntos disponibles</p>
          </div>

          {prox && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[11px] opacity-90">
                <span>Próxima: {prox.nombre}</span>
                <span>faltan {prox.puntosFaltantes}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/25">
                <div className="h-1.5 rounded-full bg-white" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {m.siguienteNivelNombre && (
            <p className="mt-3 text-[11px] opacity-90">
              Te faltan <strong>{m.puntosParaSiguienteNivel}</strong> puntos para {m.siguienteNivelNombre}
            </p>
          )}

          <p className="mt-3 text-[10px] opacity-60">
            Acumulado histórico: {m.puntosAcumHistorico} pts
          </p>
        </div>

        {/* ── EL QR DEL CLIENTE: lo escanea el barbero ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-sm font-semibold text-gray-900">Muestra este código en el mostrador</p>
          <p className="mt-0.5 text-xs text-gray-500">Tu barbero lo escanea y tus puntos entran solos.</p>

          <div className="mt-4 flex justify-center">
            <div className="rounded-xl border border-gray-200 p-3">
              <QRCodeSVG value={m.codigoQr} size={168} level="M" marginSize={0} />
            </div>
          </div>

          {/* Solo aparece cuando Google Wallet esté activo (Entrega 2). */}
          {m.enlaceWallet ? (
            <a
              href={m.enlaceWallet}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Agregar a Google Wallet
            </a>
          ) : (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <Lock size={12} weight="fill" /> Guarda esta página en tu pantalla de inicio: funciona sin apps.
            </p>
          )}
        </div>

        {/* ── RECOMPENSAS ── */}
        {m.recompensas.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <Gift size={13} weight="fill" /> Recompensas
            </p>
            <div className="space-y-2">
              {m.recompensas.map((r) => {
                const agotada = r.stock === 0
                return (
                  <div
                    key={r.idRecompensa}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 ${
                      r.canjeable ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-100'
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-base">
                      {r.icono || '🎁'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{r.nombre}</p>
                      {r.descripcion && (
                        <p className="truncate text-[11px] text-gray-500">{r.descripcion}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-gray-900">{r.puntosRequeridos} pts</p>
                      <p className={`text-[10px] ${agotada ? 'text-rose-500' : r.canjeable ? 'font-semibold text-emerald-600' : 'text-gray-400'}`}>
                        {agotada ? 'Agotada' : r.canjeable ? '¡Ya la puedes canjear!' : `faltan ${r.puntosFaltantes}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-gray-400">
              El canje lo hace tu barbero en el local.
            </p>
          </div>
        )}

        {/* ── MOVIMIENTOS ── */}
        {m.movimientos.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <ClockCounterClockwise size={13} weight="fill" /> Tus movimientos
            </p>
            <div className="space-y-1">
              {m.movimientos.map((mov, i) => (
                <div key={i} className="flex items-center justify-between gap-2 border-b border-gray-50 py-1.5 text-xs last:border-0">
                  <span className="min-w-0 truncate text-gray-500">
                    {fechaCorta(mov.fecha)} · {mov.motivo || mov.tipo}
                  </span>
                  <span className={`shrink-0 font-semibold ${mov.puntos >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {mov.puntos >= 0 ? `+${mov.puntos}` : mov.puntos}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="pt-2 text-center text-[10px] text-gray-300">barber.pe</p>
      </div>
    </div>
  )
}

export default MonederoPublicoPage
