import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CircleNotch, Star, Gift, Medal, CheckCircle, WarningCircle, ArrowRight,
  Confetti, ShieldCheck, WhatsappLogo, Envelope, CaretLeft,
} from '@phosphor-icons/react'
import { buildImageUrl } from '@/services/apiClient'
import {
  inscripcionService,
  type InscripcionInfo,
  type EvaluacionInscripcion,
} from '@/services/inscripcionService'
import { CampoCumpleanos } from '@/components/CampoCumpleanos'

/**
 * LANDING DE ALTA — barber.pe/unirme/:idSede   (PÚBLICA, sin sesión)
 *
 * A donde apunta el QR del CARTEL del local. El mismo QR para todos: por eso no
 * puede traer una tarjeta hecha.
 *
 * ─── FASE 2 · el flujo de 3 pasos ──────────────────────────────────────────
 *
 *   DATOS → (evaluar) → ¿hace falta código?
 *                        │
 *                        ├── NO  → alta directa. 30 segundos. Es el 80-90%.
 *                        └── SÍ  → CÓDIGO → confirmar
 *
 * La seguridad es PROPORCIONAL AL RIESGO. Solo se pide código cuando hay una
 * identidad ajena de por medio:
 *
 *   • Teléfono ya registrado  → WhatsApp. Incluye el T14 ("ya tienes 80 puntos"):
 *     sin código, cualquiera teclearía tu número y se quedaría con tu tarjeta.
 *   • Correo que ya reservó   → Email. Vincula tu historial, solo si lo confirmas.
 *   • Nadie                   → directo, sin fricción.
 *
 * El servidor REEVALÚA el caso en cada paso: el `caso` que manda esta pantalla es
 * una pista, no una orden. Si nos fiáramos de él, bastaría con mandar "Nuevo".
 */
type Paso = 'datos' | 'codigo' | 'listo'

export function UnirmePage() {
  const { idSede } = useParams()
  const navigate = useNavigate()
  const sedeId = Number(idSede)

  const [info, setInfo] = useState<InscripcionInfo | null>(null)
  const [cargando, setCargando] = useState(true)

  const [paso, setPaso] = useState<Paso>('datos')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [cumple, setCumple] = useState('')

  const [evaluacion, setEvaluacion] = useState<EvaluacionInscripcion | null>(null)
  const [codigo, setCodigo] = useState('')
  const [vincular, setVincular] = useState(true)

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [listo, setListo] = useState<{ codigo: string; yaExistia: boolean; wallet?: string | null } | null>(null)

  useEffect(() => {
    if (!Number.isFinite(sedeId) || sedeId <= 0) { setCargando(false); return }
    inscripcionService.getInfo(sedeId).then(setInfo).finally(() => setCargando(false))
  }, [sedeId])

  const msgError = (e: any, fallback: string) =>
    e?.response?.data?.detail || e?.response?.data?.mensaje || fallback

  /* ── PASO 1 → evaluar ────────────────────────────────────────────────── */
  const continuar = async () => {
    setError(null)
    if (nombre.trim().length < 2) { setError('Escribe tu nombre.'); return }
    if (telefono.trim().length !== 9) { setError('Tu celular debe tener 9 dígitos.'); return }
    if (correo.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim())) {
      setError('Ese correo no parece válido.'); return
    }

    setEnviando(true)
    try {
      const ev = await inscripcionService.evaluar(sedeId, {
        nombreCompleto: nombre.trim(),
        telefono: telefono.trim(),
        correo: correo.trim() || null,
      })
      setEvaluacion(ev)

      if (!ev.requiereOtp) {
        // Caso C: nadie con esos datos. Nada que robar → entra directo.
        const r = await inscripcionService.inscribirse(sedeId, {
          nombreCompleto: nombre.trim(),
          telefono: telefono.trim(),
          correo: correo.trim() || null,
          fechaNacimiento: cumple || null,
        })
        setListo({ codigo: r.codigoQr, yaExistia: r.yaExistia, wallet: r.enlaceWallet })
        setPaso('listo')
        return
      }

      // Hay identidad ajena de por medio: hay que verificar.
      await inscripcionService.enviarOtp(sedeId, {
        telefono: telefono.trim(),
        correo: correo.trim() || null,
        caso: ev.caso,
      })
      setPaso('codigo')
    } catch (e: any) {
      setError(msgError(e, 'No pudimos continuar. Revisa tus datos.'))
    } finally {
      setEnviando(false)
    }
  }

  /* ── PASO 2 → confirmar ──────────────────────────────────────────────── */
  const confirmar = async () => {
    setError(null)
    if (!evaluacion) return
    if (codigo.trim().length < 4) { setError('Escribe el código que te enviamos.'); return }

    setEnviando(true)
    try {
      const r = await inscripcionService.confirmar(sedeId, {
        nombreCompleto: nombre.trim(),
        telefono: telefono.trim(),
        correo: correo.trim() || null,
        fechaNacimiento: cumple || null,
        caso: evaluacion.caso,
        codigo: codigo.trim(),
        vincularCorreo: vincular,
      })
      setListo({ codigo: r.codigoQr, yaExistia: r.yaExistia, wallet: r.enlaceWallet })
      setPaso('listo')
    } catch (e: any) {
      setError(msgError(e, 'El código no es válido o ya venció.'))
    } finally {
      setEnviando(false)
    }
  }

  const reenviar = async () => {
    if (!evaluacion) return
    setError(null)
    try {
      await inscripcionService.enviarOtp(sedeId, {
        telefono: telefono.trim(),
        correo: correo.trim() || null,
        caso: evaluacion.caso,
      })
    } catch (e: any) {
      setError(msgError(e, 'Espera un momento antes de pedir otro código.'))
    }
  }

  /* ── Estados de carga / error ────────────────────────────────────────── */
  if (cargando) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50">
        <CircleNotch size={28} className="animate-spin text-gray-300" />
      </div>
    )
  }

  if (!info) {
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50 p-6 text-center">
        <div>
          <WarningCircle size={40} weight="fill" className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">Este local no existe</p>
          <p className="mt-1 text-sm text-gray-500">Revisa el código QR o pregunta en el mostrador.</p>
        </div>
      </div>
    )
  }

  const color = info.color || '#111827'
  const campo = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'

  /* ══════════════ PASO 3 — LISTO ══════════════ */
  if (paso === 'listo' && listo) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white" style={{ background: color }}>
            {listo.yaExistia ? <CheckCircle size={30} weight="fill" /> : <Confetti size={30} weight="fill" />}
          </div>

          <h1 className="mt-4 text-xl font-bold text-gray-900">
            {listo.yaExistia ? '¡Recuperaste tu tarjeta!' : '¡Listo! Ya eres parte del club'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {listo.yaExistia
              ? 'Es la misma de siempre, con todos tus puntos intactos.'
              : `Desde ahora, cada visita a ${info.nombreNegocio} te suma puntos.`}
          </p>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => navigate(`/monedero/${listo.codigo}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
              style={{ background: color }}
            >
              Ver mi tarjeta y mi QR <ArrowRight size={16} weight="bold" />
            </button>

            {/* Solo aparece cuando Google Wallet esté activo (Fase 3). Mientras tanto
                el monedero web ya funciona — en cualquier teléfono, iPhone incluido. */}
            {listo.wallet && (
              <a
                href={listo.wallet}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Agregar a Google Wallet
              </a>
            )}
          </div>

          <p className="mt-4 text-[11px] text-gray-400">
            Guarda el enlace de tu tarjeta: funciona en cualquier celular, sin instalar nada.
          </p>
        </div>
      </div>
    )
  }

  /* ══════════════ PASO 2 — CÓDIGO ══════════════ */
  if (paso === 'codigo' && evaluacion) {
    const esWhatsApp = evaluacion.canalOtp === 'WhatsApp'
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-sm">
          <button
            onClick={() => { setPaso('datos'); setCodigo(''); setError(null) }}
            className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            <CaretLeft size={12} weight="bold" /> Volver
          </button>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                {esWhatsApp ? <WhatsappLogo size={22} weight="fill" /> : <Envelope size={22} weight="fill" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight text-gray-900">
                  {evaluacion.yaTieneTarjeta ? 'Confirma que eres tú' : 'Verifica tu número'}
                </p>
                <p className="text-xs text-gray-400">
                  Te lo enviamos a {evaluacion.destinoEnmascarado}
                </p>
              </div>
            </div>

            <p className="mb-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
              <ShieldCheck size={15} weight="fill" className="mt-px shrink-0 text-emerald-600" />
              {evaluacion.mensaje}
            </p>

            <label className="mb-1 block text-xs font-medium text-gray-500">Código</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={`${campo} text-center text-lg font-bold tracking-[0.3em] tabular-nums`}
            />

            {/* T3 — AVISO DE CAMBIO DE NOMBRE.
                El caso "TelefonoExistente" significa que esa persona YA está en el
                sistema (probablemente reservó antes con otro nombre: "Pepito XXX").
                Al verificarse por OTP, el nombre que acaba de escribir pasa a ser el
                bueno y reemplaza al anterior (`nombreAutoritativo` en el backend).

                ⚠️ NO se le muestra cuál era su nombre anterior, y es a propósito: el
                endpoint /evaluar no lo devuelve. Si lo hiciera, cualquiera podría
                teclear un número ajeno y averiguar el nombre de esa persona sin pasar
                ningún código. Es una fuga de datos disfrazada de comodidad.

                Así que se le avisa de lo que VA A PASAR, sin revelarle nada de nadie.
                Si no quería cambiarlo, puede volver atrás y escribir el de antes — o
                corregirlo luego desde su monedero. */}
            {evaluacion.caso === 'TelefonoExistente' && nombre.trim().length >= 2 && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
                <ShieldCheck size={15} weight="fill" className="mt-px shrink-0 text-gray-400" />
                <span>
                  Al confirmar, tu nombre quedará como{' '}
                  <strong className="text-gray-800">{nombre.trim()}</strong>.
                  <span className="mt-0.5 block text-[11px] text-gray-400">
                    Si antes usaste otro, este lo reemplaza. Podrás cambiarlo cuando quieras
                    desde tu monedero.
                  </span>
                </span>
              </p>
            )}

            {/* Caso B: vincular o no la reserva antigua. Es SU decisión, no la nuestra.
                Si dice que no, se le crea una ficha nueva solo con su teléfono. */}
            {evaluacion.caso === 'CorreoExistente' && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-gray-100 p-3 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={vincular}
                  onChange={(e) => setVincular(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300"
                />
                <span>
                  <strong className="text-gray-800">Sí, esa reserva es mía.</strong> Une mi historial a mi
                  nueva tarjeta.
                  <span className="mt-0.5 block text-[11px] text-gray-400">
                    Si lo desmarcas, empiezas de cero con una tarjeta nueva.
                  </span>
                </span>
              </label>
            )}

            {error && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
                <WarningCircle size={14} weight="fill" className="mt-px shrink-0" /> {error}
              </p>
            )}

            <button
              onClick={confirmar}
              disabled={enviando}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: color }}
            >
              {enviando ? <CircleNotch size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="fill" />}
              {enviando ? 'Verificando…' : 'Confirmar'}
            </button>

            <button
              onClick={reenviar}
              className="mt-2 w-full text-center text-[11px] text-gray-400 hover:text-gray-600"
            >
              No me llegó · reenviar código
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════ PASO 1 — DATOS ══════════════ */
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-sm">

        {/* Cabecera con la marca del NEGOCIO, no la de Barber.pe */}
        <div className="rounded-2xl p-5 text-center text-white" style={{ background: `linear-gradient(135deg, ${color}, #111827)` }}>
          {info.logo && (
            <img src={buildImageUrl(info.logo)} alt="" className="mx-auto mb-2 h-14 w-14 rounded-xl bg-white/90 object-contain p-1" />
          )}
          <p className="text-lg font-black uppercase leading-tight tracking-wide">{info.nombreNegocio}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs opacity-90">
            <Star size={12} weight="fill" /> Programa de fidelización
          </p>
        </div>

        {!info.programaActivo ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
            <WarningCircle size={20} weight="fill" className="mx-auto mb-1" />
            Este local todavía no ha activado su Programa de Fidelización. Pregunta en el mostrador.
          </div>
        ) : (
          <>
            {/* Enganche: qué gano */}
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">Acumula puntos en cada visita</p>
              <p className="mt-0.5 text-xs text-gray-500">
                1 punto por cada S/ {Number(info.solesPorPunto || 1).toFixed(2)} que gastes.
              </p>

              {info.recompensas.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <Gift size={12} weight="fill" /> Puedes canjear
                  </p>
                  {info.recompensas.slice(0, 4).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-gray-700">{r.icono ? `${r.icono} ` : ''}{r.nombre}</span>
                      <span className="shrink-0 text-xs font-bold text-gray-900">{r.puntosRequeridos} pts</span>
                    </div>
                  ))}
                </div>
              )}

              {info.niveles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
                  {[...info.niveles].sort((a, b) => a.puntosMinimos - b.puntosMinimos).map((n, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ background: n.color || '#9ca3af' }}
                    >
                      <Medal size={10} weight="fill" /> {n.nombre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario */}
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Tu nombre</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Carlos Ramos"
                    autoComplete="name"
                    className={campo}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Tu celular</label>
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="9 dígitos"
                    inputMode="numeric"
                    autoComplete="tel"
                    className={`${campo} tabular-nums`}
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Es tu identificación: con él tu barbero te suma los puntos.
                  </p>
                </div>

                {/* El correo es OPCIONAL pero vale oro: es lo que engancha, solo, la
                    reserva que hizo hace meses dejando únicamente el correo. Sin él,
                    esa historia se pierde y empieza de cero. */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Tu correo <span className="font-normal text-gray-400">· opcional</span>
                  </label>
                  <input
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    inputMode="email"
                    autoComplete="email"
                    className={campo}
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    ¿Ya reservaste aquí con tu correo? Ponlo y recuperamos tu historial.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Tu cumpleaños <span className="font-normal text-gray-400">· opcional</span>
                  </label>
                  {/* T5 — Era un <input type="date">. En Android eso abre el picker nativo,
                      que arranca en el mes actual: para llegar a 1987 hay que pulsar la
                      flecha ~460 veces. Ahora se teclea: 13081987 → 13/08/1987. */}
                  <CampoCumpleanos id="cumple" value={cumple} onChange={setCumple} className={campo} />
                </div>
              </div>

              {error && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
                  <WarningCircle size={14} weight="fill" className="mt-px shrink-0" /> {error}
                </p>
              )}

              <button
                onClick={continuar}
                disabled={enviando}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: color }}
              >
                {enviando ? <CircleNotch size={16} className="animate-spin" /> : <Star size={16} weight="fill" />}
                {enviando ? 'Un momento…' : 'Unirme al programa'}
              </button>

              {/* T4 — DOS bugs aquí:
                  1. Apuntaba a /terminos, que es el contrato B2B con el DUEÑO del negocio
                     ("Al crear una cuenta…", "Como propietario del negocio, eres responsable
                     de…"). Nada de eso aplica a alguien que solo quiere puntos por su corte.
                     Ahora apunta a /privacidad-clientes (B2C).
                  2. Sin target="_blank": al pulsar el link se navegaba FUERA y se perdía el
                     formulario a medio llenar. */}
              <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
                Al unirte aceptas cómo{' '}
                <a
                  href="/privacidad-clientes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-600"
                >
                  tratamos tus datos
                </a>.
              </p>
            </div>
          </>
        )}

        <p className="mt-6 text-center text-[10px] text-gray-300">barber.pe</p>
      </div>
    </div>
  )
}

export default UnirmePage
