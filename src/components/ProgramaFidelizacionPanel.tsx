import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CircleNotch, FloppyDisk, Plus, Trash, Medal, Gift, Star, Lightning,
  Coins, Hourglass, QrCode, Sliders, Eye, Wallet, WarningCircle, Confetti,
  MapPin, Buildings,
} from '@phosphor-icons/react'
import { PreviewMultiplicador } from '@/components/PreviewMultiplicador'
import { PromocionesFidelizacionPanel } from '@/components/PromocionesFidelizacionPanel'
import { QrInscripcionModal } from '@/components/QrInscripcionModal'
import { buildImageUrl } from '@/services/apiClient'
import {
  fidelizacionService,
  type ProgramaConfig,
  type GuardarProgramaConfig,
  type NivelFidel,
  type RecompensaFidel,
  type TipoRecompensaFidel,
} from '@/services/fidelizacionService'
import { serviciosService } from '@/services/serviciosService'
import { ComboBox } from '@/components/ComboBox'

/* ═══════════════════════════════════════════════════════════════════════════
   NumberField — arregla EL BUG DEL "0" EN MÓVIL.

   Antes:  value={n.puntosMinimos}  onChange={e => set(Number(e.target.value))}
   Al borrar el campo, e.target.value === '' → Number('') === 0 → el estado
   vuelve a 0 → el input se repinta con "0" y NO se puede vaciar para escribir
   otro número (en móvil, sin flechas, quedas atrapado).

   Aquí el input mantiene su PROPIO buffer de texto: puede estar vacío mientras
   el usuario escribe. Solo se emite el número cuando hay algo que emitir, y al
   salir del campo (blur) se normaliza a `min` si quedó vacío.
   ═══════════════════════════════════════════════════════════════════════════ */
function NumberField({
  value, onChange, min = 0, step = 1, placeholder, className, prefix, suffix, ariaLabel,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  step?: number
  placeholder?: string
  className?: string
  prefix?: string
  suffix?: string
  ariaLabel?: string
}) {
  const [txt, setTxt] = useState<string>(String(value ?? min))

  // Si el valor llega desde fuera (carga inicial, preset…), sincronizamos —
  // pero NO mientras el usuario tiene el campo a medio escribir.
  useEffect(() => {
    if (txt === '' ) return
    if (Number(txt) !== Number(value)) setTxt(String(value ?? min))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={txt}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, '')
          setTxt(raw)                       // ← se permite quedar VACÍO
          if (raw !== '' && !Number.isNaN(Number(raw))) onChange(Number(raw))
        }}
        onBlur={() => {
          if (txt === '' || Number.isNaN(Number(txt))) {
            setTxt(String(min))
            onChange(min)
          }
        }}
        className={`w-full rounded-lg border border-gray-200 py-2 text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 ${prefix ? 'pl-9' : 'pl-3'} ${suffix ? 'pr-12' : 'pr-3'} ${className ?? ''}`}
        step={step}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          {suffix}
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */

const input =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'

const VENCIMIENTOS = [
  { v: '', label: 'Nunca vencen' },
  { v: '6', label: '6 meses' },
  { v: '12', label: '12 meses' },
  { v: '18', label: '18 meses' },
  { v: '24', label: '24 meses' },
]

/** Iconos sugeridos para las recompensas. Emoji a propósito: el mismo valor se
 *  muestra en la tarjeta de Google Wallet, el monedero web y el cartel IMPRESO
 *  (contextos que no son React), donde un ícono SVG no renderiza. El Admin puede
 *  dejarla sin icono. */
const ICONOS = ['🎁', '💈', '✂️', '🪒', '🧔', '🧴', '🧢', '☕', '🥤', '🎂', '🎟️', '⭐', '🔥', '👑', '💯', '🏆']

/**
 * Sugerencia precargada al crear un programa nuevo. Casi todos los SaaS lo hacen:
 * no obligan al dueño a inventar toda la escalera desde cero. Luego la edita.
 */
const NIVELES_SUGERIDOS: NivelFidel[] = [
  { nombre: 'Bronce',  puntosMinimos: 0,    orden: 0, color: '#B45309' },
  { nombre: 'Plata',   puntosMinimos: 300,  orden: 1, color: '#6B7280' },
  { nombre: 'Oro',     puntosMinimos: 700,  orden: 2, color: '#CA8A04' },
  { nombre: 'Platino', puntosMinimos: 1200, orden: 3, color: '#0F766E' },
]

const RECOMPENSA_VACIA: RecompensaFidel = {
  // T7 — alcance 'Sede' por defecto, a propósito. Es lo conservador: nadie debe
  // regalar una recompensa en los tres locales de la marca sin haberlo decidido.
  nombre: '', descripcion: '', icono: '🎁', puntosRequeridos: 100, stock: null, activo: true,
  alcance: 'Sede',
}
const NIVEL_VACIO: NivelFidel = { nombre: '', puntosMinimos: 0, orden: 0, color: '#C9A227' }

const soles = (n: number) => `S/ ${(Number(n) || 0).toFixed(2)}`

/* ═══════════════════════════════════════════════════════════════════════════ */

export function ProgramaFidelizacionPanel() {
  const [cfg, setCfg] = useState<ProgramaConfig>({
    activo: false, solesPorPunto: 1, multiplicadorBase: 1, puntosExpiranMeses: null,
    // T7
    multiplicadorMaximo: 5, multiplicadorSede: null, sedeActiva: true,
    // T13
    nombrePrograma: null,
    niveles: [], recompensas: [],
  })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [avanzado, setAvanzado] = useState(false)
  const [qrAbierto, setQrAbierto] = useState(false)

  // Servicios de la sede: para el picker de "servicio gratis" de una recompensa.
  const [servicios, setServicios] = useState<any[]>([])
  useEffect(() => {
    serviciosService.getServicios()
      .then((s: any) => setServicios(Array.isArray(s) ? s.filter((x: any) => x.estado !== false) : []))
      .catch(() => {})
  }, [])

  // Simulador: cuánto gasta el cliente de ejemplo.
  const [simGasto, setSimGasto] = useState(85)
  // Puntos que ya tiene ese cliente de ejemplo (para el "próximo nivel").
  const [simPuntosPrevios, setSimPuntosPrevios] = useState(350)

  useEffect(() => {
    fidelizacionService.getConfig()
      .then((c) => {
        setCfg(c)
        // Si el multiplicador base ya venía en algo distinto de x1, abrimos el
        // bloque avanzado: si no, el Admin no vería por qué sus puntos se doblan.
        if ((c.multiplicadorBase ?? 1) > 1) setAvanzado(true)
      })
      .catch(() => toast.error('No se pudo cargar el programa'))
      .finally(() => setCargando(false))
  }, [])

  const set = (patch: Partial<ProgramaConfig>) => setCfg((c) => ({ ...c, ...patch }))

  // --- Niveles ---
  const addNivel = () => set({ niveles: [...cfg.niveles, { ...NIVEL_VACIO, orden: cfg.niveles.length }] })
  const setNivel = (i: number, patch: Partial<NivelFidel>) =>
    set({ niveles: cfg.niveles.map((n, k) => (k === i ? { ...n, ...patch } : n)) })
  const delNivel = (i: number) => set({ niveles: cfg.niveles.filter((_, k) => k !== i) })
  const usarSugeridos = () => set({ niveles: NIVELES_SUGERIDOS.map((n) => ({ ...n })) })

  // --- Recompensas ---
  const addRec = () => set({ recompensas: [...cfg.recompensas, { ...RECOMPENSA_VACIA }] })
  const setRec = (i: number, patch: Partial<RecompensaFidel>) =>
    set({ recompensas: cfg.recompensas.map((r, k) => (k === i ? { ...r, ...patch } : r)) })
  const delRec = (i: number) => set({ recompensas: cfg.recompensas.filter((_, k) => k !== i) })

  // Niveles ordenados por puntos: es como el cliente los va a recorrer.
  const nivelesOrdenados = useMemo(
    () => [...cfg.niveles].sort((a, b) => a.puntosMinimos - b.puntosMinimos),
    [cfg.niveles],
  )

  /* ── SIMULADOR ─────────────────────────────────────────────────────────────
     Misma fórmula que el backend: floor(total / solesPorPunto × multiplicador).
     El multiplicador es el MÁS ALTO entre el base y las promos vigentes hoy
     (no se multiplican entre sí).                                             */
  // T7 — REGLA C+. Antes esto era `Math.max(multBase, multPromo)`, y tenía un fallo
  // que se notaba en producción: la promo del martes NO HACÍA NADA en una sede que ya
  // estuviera en x2. El encargado creaba la campaña, la anunciaba, y el cliente recibía
  // los mismos puntos de siempre.
  //
  // Ahora la marca y la sede son LA MISMA CAPA (la tasa permanente) y compiten por
  // override; la promo es OTRA capa y se multiplica encima. Todo topado.
  // Espejo exacto de Services/Fidelizacion/MultiplicadorPuntos.cs.
  const promoHoy = (cfg.promociones ?? []).filter((p) => p.vigenteHoy && p.activo)
  const multPromo = promoHoy.length ? Math.max(...promoHoy.map((p) => p.multiplicador)) : 1
  const multBase = cfg.multiplicadorBase ?? 1
  const multSede = cfg.multiplicadorSede ?? null
  const tope = cfg.multiplicadorMaximo ?? 5

  // La sede SOBRESCRIBE a la marca (no es un MAX: una sede debe poder BAJAR).
  const multEfectivo = multSede ?? multBase
  const multAplicado = Math.min(multEfectivo * multPromo, tope)

  const promoGanadora = multPromo > 1
    ? promoHoy.find((p) => p.multiplicador === multPromo)?.nombre
    : null

  const sim = useMemo(() => {
    const sxp = cfg.solesPorPunto > 0 ? cfg.solesPorPunto : 1
    const gana = Math.floor((simGasto / sxp) * multAplicado)
    const acumulado = simPuntosPrevios + gana
    // El nivel se calcula con el ACUMULADO HISTÓRICO (canjear no te baja de nivel).
    const actual = [...nivelesOrdenados].reverse().find((n) => n.puntosMinimos <= acumulado) ?? null
    const siguiente = nivelesOrdenados.find((n) => n.puntosMinimos > acumulado) ?? null
    const nivelAntes = [...nivelesOrdenados].reverse().find((n) => n.puntosMinimos <= simPuntosPrevios) ?? null
    const subio = !!actual && actual.nombre !== (nivelAntes?.nombre ?? '')
    return {
      gana,
      acumulado,
      actual,
      siguiente,
      subio,
      faltan: siguiente ? siguiente.puntosMinimos - acumulado : 0,
    }
  }, [cfg.solesPorPunto, multAplicado, simGasto, simPuntosPrevios, nivelesOrdenados])

  /* ── Guardar ─────────────────────────────────────────────────────────────── */
  const guardar = async () => {
    if (cfg.solesPorPunto <= 0) { toast.error('Los soles por punto deben ser mayores a 0'); return }
    if ((cfg.multiplicadorBase ?? 1) < 1) { toast.error('El multiplicador base debe ser 1 o mayor'); return }
    // T7 — un multiplicador < 1 no "abarataría" los puntos: se los COMERÍA.
    if (cfg.multiplicadorSede != null && cfg.multiplicadorSede < 1) { toast.error('El multiplicador de la sede debe ser 1 o mayor'); return }
    if ((cfg.multiplicadorMaximo ?? 5) < 1) { toast.error('El tope del multiplicador debe ser 1 o mayor'); return }
    if (cfg.niveles.some((n) => !n.nombre.trim())) { toast.error('Cada nivel necesita un nombre'); return }
    if (cfg.recompensas.some((r) => !r.nombre.trim())) { toast.error('Cada recompensa necesita un nombre'); return }
    if (cfg.recompensas.some((r) => r.puntosRequeridos < 1)) { toast.error('Cada recompensa necesita al menos 1 punto'); return }
    if (cfg.recompensas.some((r) => r.tipo === 'ServicioGratis' && !r.idServicio)) {
      toast.error('El premio "servicio gratis" necesita que elijas el servicio'); return
    }
    if (cfg.recompensas.some((r) => (r.tipo === 'DescuentoPorcentaje' || r.tipo === 'DescuentoMonto') && (!r.valor || r.valor <= 0))) {
      toast.error('El descuento necesita un valor mayor a 0'); return
    }

    setGuardando(true)
    try {
      // El `orden` de cada nivel = su posición por puntos mínimos (así el nivel
      // más barato queda primero, sin importar en qué orden los escribió el Admin).
      const payload: GuardarProgramaConfig = {
        activo: cfg.activo,
        solesPorPunto: cfg.solesPorPunto,
        multiplicadorBase: cfg.multiplicadorBase ?? 1,
        puntosExpiranMeses: cfg.puntosExpiranMeses ?? null,
        // T7 — el tope es de la MARCA; el multiplicador y la pausa son de ESTA sede.
        multiplicadorMaximo: cfg.multiplicadorMaximo ?? 5,
        multiplicadorSede: cfg.multiplicadorSede ?? null,
        sedeActiva: cfg.sedeActiva !== false,
        // T13 — título de la tarjeta
        nombrePrograma: cfg.nombrePrograma?.trim() || null,
        niveles: nivelesOrdenados.map((n, i) => ({ ...n, orden: i })),
        recompensas: cfg.recompensas,
      }
      await fidelizacionService.guardarConfig(payload)
      toast.success('Programa de fidelización guardado')
      // Releemos: el backend devuelve ids nuevos, la marca y el estado del wallet.
      setCfg(await fidelizacionService.getConfig())
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <CircleNotch size={24} className="animate-spin" />
      </div>
    )
  }

  const colorMarca = cfg.colorNegocio || '#111827'
  const nPromos = (cfg.promociones ?? []).length

  return (
    <div className="space-y-5">

      {/* ══════════════ RESUMEN — cómo quedó configurado, de un vistazo ══════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Star size={20} weight="fill" className="text-amber-400" />
            <div>
              <h3 className="font-semibold text-gray-900">Programa de fidelización</h3>
              <p className="text-xs text-gray-500">
                {cfg.activo
                  ? 'Activo: cada venta con cliente identificado suma puntos.'
                  : 'Desactivado: no se están acumulando puntos.'}
              </p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={cfg.activo}
              onChange={(e) => set({ activo: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className={`text-sm font-medium ${cfg.activo ? 'text-emerald-700' : 'text-gray-500'}`}>
              {cfg.activo ? 'Programa activo' : 'Desactivado'}
            </span>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Chip valor={`1 pt = ${soles(cfg.solesPorPunto)}`} etiqueta="Acumulación" />
          <Chip valor={String(cfg.niveles.length)} etiqueta={cfg.niveles.length === 1 ? 'nivel' : 'niveles'} />
          <Chip valor={String(cfg.recompensas.length)} etiqueta={cfg.recompensas.length === 1 ? 'recompensa' : 'recompensas'} />
          <Chip valor={String(nPromos)} etiqueta={nPromos === 1 ? 'promoción' : 'promociones'} />
        </div>

        {/* QR del local: el cartel que se cuelga en la barbería. El MISMO para
            todos: no puede llevar una tarjeta ya hecha. */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setQrAbierto(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            <QrCode size={16} weight="bold" /> QR de inscripción del local
          </button>
          <span className="text-[11px] text-gray-400">
            Imprímelo y cuélgalo. Tus clientes lo escanean una vez y se inscriben solos.
          </span>
        </div>
      </section>

      {/* ══════════════ 1. ACUMULACIÓN ══════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Coins size={18} weight="fill" className="text-emerald-600" />
          <h3 className="font-semibold text-gray-900">¿Cómo acumulan puntos tus clientes?</h3>
        </div>

        {/* La frase se lee de corrido, no como tres campos sueltos. */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <span>Cada</span>
          <div className="w-20">
            <NumberField value={1} onChange={() => { /* fijo: la unidad es 1 punto */ }} min={1} ariaLabel="Puntos" className="bg-gray-50 text-center font-semibold" />
          </div>
          <span className="font-medium">punto</span>
          <span>por cada</span>
          <div className="w-32">
            <NumberField
              value={cfg.solesPorPunto}
              onChange={(v) => set({ solesPorPunto: v })}
              min={0.1}
              step={0.1}
              prefix="S/"
              ariaLabel="Soles por punto"
              className="font-semibold"
            />
          </div>
          <span>gastado</span>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          Ejemplo: con S/ {cfg.solesPorPunto || 1} por punto, una venta de {soles(50)} da{' '}
          <strong className="text-gray-600">{Math.floor(50 / (cfg.solesPorPunto || 1))} puntos</strong>.
        </p>

        {/* Vigencia */}
        <div className="mt-5 max-w-xs">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Hourglass size={13} weight="fill" className="text-gray-400" /> Vigencia de los puntos
          </label>
          <ComboBox value={cfg.puntosExpiranMeses ?? ''} onChange={(v) => set({ puntosExpiranMeses: v === '' ? null : Number(v) })} opciones={VENCIMIENTOS.map((o) => ({ valor: o.v, etiqueta: o.label }))} inputClassName={input} />
        </div>

        {/* Multiplicador base: fuera del camino. El 95% no lo toca nunca; las
            promos de días concretos se configuran más abajo. */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          {!avanzado ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                <strong className="text-gray-700">Multiplicador normal (x1).</strong>{' '}
                Las promociones especiales se configuran más abajo.
              </p>
              <button
                type="button"
                onClick={() => setAvanzado(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                <Sliders size={13} /> Avanzado
              </button>
            </div>
          ) : (
            <div className="max-w-md">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Lightning size={13} weight="fill" className="text-amber-500" /> Multiplicador permanente
              </label>
              <ComboBox value={String(cfg.multiplicadorBase ?? 1)} onChange={(v) => set({ multiplicadorBase: Number(v) })} opciones={[{ valor: '1', etiqueta: 'Multiplicador normal (x1)' }, { valor: '2', etiqueta: 'x2 — Doble puntaje SIEMPRE' }, { valor: '3', etiqueta: 'x3 — Triple puntaje SIEMPRE' }]} inputClassName={input} />
              <p className="mt-1 text-[11px] text-gray-400">
                Aplica en TODAS las sedes de tu negocio. Cada sede puede sobrescribirlo abajo.
              </p>

              {/* ══ T7 · TOPE DURO (MARCA) ══════════════════════════════════════
                  La red de seguridad. Con tres capas configurables por gente distinta
                  (marca, sede, promo), es cuestión de tiempo que alguien acabe en x12
                  sin darse cuenta: aniversario x2 · sede x2 · finde x3. Nadie quiso
                  regalar eso; simplemente nadie vio las tres capas a la vez. */}
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Tope del multiplicador
                </label>
                <ComboBox value={String(cfg.multiplicadorMaximo ?? 5)} onChange={(v) => set({ multiplicadorMaximo: Number(v) })} opciones={[{ valor: '2', etiqueta: 'x2 — máximo el doble' }, { valor: '3', etiqueta: 'x3' }, { valor: '5', etiqueta: 'x5 (recomendado)' }, { valor: '10', etiqueta: 'x10 — sin casi límite' }]} inputClassName={input} />
                <p className="mt-1 text-[11px] text-gray-400">
                  Pase lo que pase, ninguna venta multiplicará más que esto. Protege tu caja
                  de una combinación de campañas que nadie planeó.
                </p>
              </div>
            </div>
          )}

          {/* ══════ T7 · ESTA SEDE ═══════════════════════════════════════════════
              El programa (política de puntos, expiración, niveles, tarjeta, monedero)
              es de la MARCA. Lo de aquí abajo es SOLO de este local. */}
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <MapPin size={15} weight="fill" className="text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900">Solo en esta sede</h4>
            </div>

            <label className="mb-1 block text-xs font-medium text-gray-500">
              Multiplicador propio de esta sede
            </label>
            <ComboBox value={cfg.multiplicadorSede == null ? '' : String(cfg.multiplicadorSede)} onChange={(v) => set({ multiplicadorSede: v === '' ? null : Number(v) })} opciones={[{ valor: '', etiqueta: `Usar el de la marca (x${cfg.multiplicadorBase ?? 1})` }, { valor: '1', etiqueta: 'x1 — normal' }, { valor: '2', etiqueta: 'x2 — doble puntaje en esta sede' }, { valor: '3', etiqueta: 'x3 — triple puntaje en esta sede' }]} inputClassName={input} />
            <p className="mt-1 text-[11px] text-gray-400">
              Si eliges uno, SUSTITUYE al de la marca aquí (no se suman ni se multiplican
              entre sí). Puedes ponerlo por debajo del de la marca si este local no puede
              permitirse la campaña.
            </p>

            {/* T7 · LA VISTA PREVIA. El motivo de que exista: que nadie configure a ciegas. */}
            <div className="mt-3">
              <PreviewMultiplicador
                multiplicadorMarca={cfg.multiplicadorBase ?? 1}
                multiplicadorSede={cfg.multiplicadorSede}
                multiplicadorPromo={multPromo}
                nombrePromo={promoGanadora}
                tope={cfg.multiplicadorMaximo ?? 5}
                solesPorPunto={cfg.solesPorPunto}
              />
            </div>

            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={cfg.sedeActiva !== false}
                onChange={(e) => set({ sedeActiva: e.target.checked })}
                className="mt-0.5 rounded border-gray-300"
              />
              <span>
                <strong className="text-gray-800">Esta sede acumula puntos.</strong>
                <span className="mt-0.5 block text-[11px] text-gray-400">
                  Si lo desmarcas, aquí no se suman puntos nuevos. Los que el cliente ya
                  tiene NO se pierden: los conserva y puede canjearlos en las otras sedes.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* ══════════════ 2. NIVELES ══════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal size={18} weight="fill" className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Niveles</h3>
          </div>
          <button onClick={addNivel} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
            <Plus size={16} weight="bold" /> Agregar
          </button>
        </div>
        <p className="mb-4 text-[11px] text-gray-400">
          El nivel se calcula por los puntos <strong>acumulados históricos</strong>: canjear NO te baja de nivel.
        </p>

        {cfg.niveles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-500">Todavía no tienes niveles.</p>
            <button
              onClick={usarSugeridos}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Star size={13} weight="fill" /> Usar la escalera sugerida
            </button>
            <p className="mt-2 text-[11px] text-gray-400">Bronce 0 · Plata 300 · Oro 700 · Platino 1200. Luego los editas.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {cfg.niveles.map((n, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: n.color || '#9ca3af' }}
                    aria-hidden
                  >
                    <Medal size={16} weight="fill" />
                  </span>
                  <input
                    placeholder="Ej. Oro"
                    value={n.nombre}
                    onChange={(e) => setNivel(i, { nombre: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-transparent px-1 py-1 text-sm font-semibold text-gray-900 outline-none hover:border-gray-200 focus:border-emerald-500"
                  />
                  <button onClick={() => delNivel(i)} className="shrink-0 p-1 text-gray-300 hover:text-rose-500" title="Quitar nivel">
                    <Trash size={15} />
                  </button>
                </div>

                <div className="mt-3 flex items-end gap-3">
                  <div className="flex-1">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Desde</span>
                    <NumberField
                      value={n.puntosMinimos}
                      onChange={(v) => setNivel(i, { puntosMinimos: Math.round(v) })}
                      min={0}
                      suffix="pts"
                      ariaLabel={`Puntos mínimos del nivel ${n.nombre || i + 1}`}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Color</span>
                    <input
                      type="color"
                      value={n.color || '#C9A227'}
                      onChange={(e) => setNivel(i, { color: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-gray-200 p-0.5"
                      title="Color del nivel"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════ 3. RECOMPENSAS ══════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift size={18} weight="fill" className="text-pink-500" />
            <h3 className="font-semibold text-gray-900">Recompensas</h3>
          </div>
          <button onClick={addRec} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
            <Plus size={16} weight="bold" /> Agregar
          </button>
        </div>
        <p className="mb-4 text-[11px] text-gray-400">Lo que tus clientes canjean con sus puntos.</p>

        {cfg.recompensas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
            Todavía no tienes recompensas.<br />
            <span className="text-[11px] text-gray-400">Empieza con algo simple: 100 pts → Corte gratis.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {cfg.recompensas.map((r, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start gap-2">
                  {/* Icono: hace mucha diferencia visual en la tarjeta del cliente. */}
                  <div className="shrink-0">
                    <IconoPicker
                      valor={r.icono}
                      onChange={(ic) => setRec(i, { icono: ic })}
                      opciones={ICONOS}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      placeholder="Ej. Corte gratis"
                      value={r.nombre}
                      onChange={(e) => setRec(i, { nombre: e.target.value })}
                      className={`${input} font-semibold`}
                    />
                    <input
                      placeholder="Descripción (opcional) — ej. Incluye lavado"
                      value={r.descripcion ?? ''}
                      onChange={(e) => setRec(i, { descripcion: e.target.value })}
                      className={`${input} text-gray-600`}
                    />
                  </div>

                  <button onClick={() => delRec(i)} className="shrink-0 p-1.5 text-gray-300 hover:text-rose-500" title="Quitar recompensa">
                    <Trash size={16} />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
                  <div className="w-28">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Cuesta</span>
                    <NumberField
                      value={r.puntosRequeridos}
                      onChange={(v) => setRec(i, { puntosRequeridos: Math.round(v) })}
                      min={1}
                      suffix="pts"
                      ariaLabel="Puntos para canjear"
                    />
                  </div>

                  {/* Stock: ∞ por defecto. Muchos negocios quieren limitar la promo. */}
                  <div className="w-40">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Stock</span>
                    {r.stock === null || r.stock === undefined ? (
                      <button
                        type="button"
                        onClick={() => setRec(i, { stock: 10 })}
                        className="h-[38px] w-full rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      >
                        ∞ Ilimitado
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <NumberField
                          value={r.stock}
                          onChange={(v) => setRec(i, { stock: Math.round(v) })}
                          min={0}
                          suffix="disp."
                          ariaLabel="Stock disponible"
                        />
                        <button
                          type="button"
                          onClick={() => setRec(i, { stock: null })}
                          className="shrink-0 rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-500 hover:bg-gray-50"
                          title="Volver a ilimitado"
                        >
                          ∞
                        </button>
                      </div>
                    )}
                  </div>

                  <label className="inline-flex select-none items-center gap-1.5 whitespace-nowrap pb-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={r.activo}
                      onChange={(e) => setRec(i, { activo: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Activa
                  </label>

                  {r.stock === 0 && (
                    <span className="inline-flex items-center gap-1 pb-2 text-[11px] font-semibold text-rose-600">
                      <WarningCircle size={12} weight="fill" /> Agotada
                    </span>
                  )}
                </div>

                {/* Qué ENTREGA el premio: lo usa la caja para aplicarlo como descuento.
                    'Manual' = el barbero decide (comportamiento de siempre). */}
                <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
                  <div className="w-56">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Qué entrega</span>
                    <ComboBox
                      value={r.tipo ?? 'Manual'}
                      onChange={(v) => setRec(i, { tipo: String(v) as TipoRecompensaFidel, valor: null, idServicio: null })}
                      opciones={[
                        { valor: 'Manual', etiqueta: 'Manual · lo aplica el barbero' },
                        { valor: 'ServicioGratis', etiqueta: 'Un servicio gratis' },
                        { valor: 'DescuentoPorcentaje', etiqueta: 'Descuento en %' },
                        { valor: 'DescuentoMonto', etiqueta: 'Descuento en S/' },
                      ]}
                      inputClassName={input}
                    />
                  </div>

                  {r.tipo === 'ServicioGratis' && (
                    <div className="w-56">
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Servicio gratis</span>
                      <ComboBox
                        value={r.idServicio == null ? '' : String(r.idServicio)}
                        onChange={(v) => setRec(i, { idServicio: v === '' ? null : Number(v) })}
                        opciones={[
                          { valor: '', etiqueta: 'Elige un servicio…' },
                          ...servicios.map((s: any) => ({ valor: String(s.idServicio), etiqueta: s.nombre })),
                        ]}
                        inputClassName={input}
                      />
                    </div>
                  )}

                  {(r.tipo === 'DescuentoPorcentaje' || r.tipo === 'DescuentoMonto') && (
                    <div className="w-32">
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        {r.tipo === 'DescuentoPorcentaje' ? 'Porcentaje' : 'Monto'}
                      </span>
                      <NumberField
                        value={r.valor ?? 0}
                        onChange={(v) => setRec(i, { valor: v })}
                        min={0}
                        suffix={r.tipo === 'DescuentoPorcentaje' ? '%' : 'S/'}
                        ariaLabel="Valor del descuento"
                      />
                    </div>
                  )}
                </div>

                {/* ══ T7 · ALCANCE ═══════════════════════════════════════════════
                    ¿Vale en toda la marca, o solo aquí?

                    Y el STOCK sale solo de esta decisión, sin lógica extra:
                      · Empresa → UNA fila, IdSede NULL  → su stock ES compartido.
                      · Sede    → una fila por sede      → cada una con su stock.

                    Default 'Sede', a propósito: es lo conservador. Nadie debe regalar
                    su "Corte gratis" en los tres locales sin haberlo decidido. */}
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      Válida en
                    </span>

                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
                      <button
                        type="button"
                        onClick={() => setRec(i, { alcance: 'Sede' })}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                          r.alcance !== 'Empresa'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <MapPin size={12} weight="fill" /> Solo esta sede
                      </button>
                      <button
                        type="button"
                        onClick={() => setRec(i, { alcance: 'Empresa' })}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                          r.alcance === 'Empresa'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Buildings size={12} weight="fill" /> Cualquier sede
                      </button>
                    </div>
                  </div>

                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
                    {r.alcance === 'Empresa' ? (
                      <>
                        El cliente puede canjearla en <strong>cualquier local de tu negocio</strong>.
                        {r.stock != null && (
                          <> El stock de <strong>{r.stock}</strong> se <strong>reparte entre todas las sedes</strong>.</>
                        )}
                      </>
                    ) : (
                      <>
                        Solo se canjea <strong>aquí</strong>. Cada sede tiene su propio stock.
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════ 4. DÍAS DE PUNTOS EXTRA (promociones) ══════════════ */}
      <PromocionesFidelizacionPanel multiplicadorBase={cfg.multiplicadorBase ?? 1} />

      {/* ══════════════ 5. SIMULADOR ══════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Eye size={18} weight="fill" className="text-blue-500" />
          <h3 className="font-semibold text-gray-900">Vista previa</h3>
        </div>
        <p className="mb-4 text-[11px] text-gray-400">
          Prueba tu configuración antes de guardarla. Usa la misma fórmula que la caja.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">El cliente compra</span>
            <NumberField value={simGasto} onChange={setSimGasto} min={0} prefix="S/" ariaLabel="Monto de la compra simulada" />
          </div>
          <div>
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">Y ya tenía</span>
            <NumberField value={simPuntosPrevios} onChange={(v) => setSimPuntosPrevios(Math.round(v))} min={0} suffix="pts" ariaLabel="Puntos acumulados previos" />
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-4">
          <Fila
            etiqueta="Ganará"
            valor={`${sim.gana} punto${sim.gana === 1 ? '' : 's'}`}
            extra={multAplicado > 1
              ? `x${multAplicado}${promoGanadora ? ` · ${promoGanadora}` : ' · multiplicador permanente'}`
              : undefined}
            fuerte
          />
          <Fila etiqueta="Acumulado histórico" valor={`${sim.acumulado} pts`} />
          <Fila
            etiqueta="Nivel"
            valor={sim.actual?.nombre ?? 'Sin nivel'}
            extra={sim.subio ? '🎉 ¡Subió de nivel!' : undefined}
          />
          {sim.siguiente ? (
            <Fila
              etiqueta={`Próximo nivel: ${sim.siguiente.nombre}`}
              valor={`le faltan ${sim.faltan} pts`}
            />
          ) : (
            <Fila etiqueta="Próximo nivel" valor={nivelesOrdenados.length ? 'ya está en el nivel más alto' : '—'} />
          )}
        </div>

        {!cfg.activo && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700">
            <WarningCircle size={13} weight="fill" /> El programa está desactivado: hoy esta venta NO sumaría puntos.
          </p>
        )}
      </section>

      {/* ══════════════ 6. ASÍ VERÁ SU TARJETA TU CLIENTE ══════════════ */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-1 flex items-center gap-2">
          <Wallet size={18} weight="fill" className="text-violet-500" />
          <h3 className="font-semibold text-gray-900">Así verá su tarjeta tu cliente</h3>
        </div>
        <p className="mb-4 text-[11px] text-gray-400">
          Con TU marca, no la de Barber.pe. Funciona en cualquier teléfono desde{' '}
          <strong className="text-gray-600">barber.pe/monedero</strong>, con o sin Google Wallet.
        </p>

        {/* ══ T13 · TÍTULO DE LA TARJETA ═══════════════════════════════════════
            Antes iba hardcodeado a "Programa de fidelización" — igual para las 8
            barberías. En las tarjetas de referencia de Google ahí pone "Recompensas
            por café" o "Club del Libro": el NOMBRE del programa, no la palabra
            "programa". Es el texto grande, lo primero que lee el cliente. */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Título de la tarjeta
          </label>
          <input
            className={input}
            maxLength={60}
            value={cfg.nombrePrograma ?? ''}
            onChange={(e) => set({ nombrePrograma: e.target.value })}
            placeholder={`Puntos de ${cfg.nombreNegocio || 'tu negocio'}`}
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Lo primero que lee tu cliente. Si lo dejas vacío, ponemos{' '}
            <strong className="text-gray-600">
              «Puntos de {cfg.nombreNegocio || 'tu negocio'}»
            </strong>.
          </p>
        </div>

        {/* La FOTO de la tarjeta sale de tu portada. Se recorta a 3:1 (mucho más
            apaisada que la de compartir), y la vista previa de ese recorte vive en
            Configuración → Imagen y color, que es donde se sube. */}
        {!cfg.walletHeroUrl && (
          <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-800">
            <WarningCircle size={14} weight="fill" className="mt-px shrink-0" />
            <span>
              Tu tarjeta va <strong>sin foto</strong>. Sube una portada en{' '}
              <strong>Configuración → Imagen y color</strong> y aparecerá sola.
            </span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[minmax(0,300px)_1fr]">
          {/* Tarjeta (vista previa, con datos del simulador) */}
          <div
            className="rounded-2xl p-4 text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${sim.actual?.color || colorMarca}, #111827)` }}
          >
            <div className="flex items-center gap-2">
              {cfg.logoNegocio ? (
                <img
                  src={buildImageUrl(cfg.logoNegocio)}
                  alt=""
                  className="h-8 w-8 rounded-lg bg-white/90 object-contain p-0.5"
                />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-xs font-bold">
                  {(cfg.nombreNegocio || 'B').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold uppercase leading-tight tracking-wide">
                  {cfg.nombreNegocio || 'Tu barbería'}
                </p>
                <p className="flex items-center gap-1 text-[10px] opacity-80">
                  <Star size={10} weight="fill" /> Programa de fidelización
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-wide opacity-70">
                Nivel {sim.actual?.nombre ?? '—'}
              </p>
              <p className="text-3xl font-bold leading-none">{sim.acumulado}</p>
              <p className="text-[11px] opacity-80">puntos</p>
            </div>

            {sim.siguiente && (
              <p className="mt-3 text-[11px] opacity-90">
                Te faltan <strong>{sim.faltan}</strong> para {sim.siguiente.nombre}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-white/90 text-gray-900">
                <QrCode size={26} weight="bold" />
              </div>
              <span className="text-[10px] opacity-70">Tu barbero escanea este QR</span>
            </div>
          </div>

          {/* T9 — El PNG de Google Wallet es INVISIBLE.
              Antes había aquí un bloque explicando WebP/PNG y un botón "Preparar el
              logo". El Admin no tiene por qué enterarse de que Google exige PNG: eso
              es un problema nuestro. Ahora el derivado se genera solo (al subir el
              logo y al guardar el programa) y aquí no queda ni rastro.

              Lo ÚNICO que sí es asunto suyo: si no tiene logo, sus tarjetas saldrían
              en blanco. Eso sí se le dice — y solo eso. */}
          <div className="space-y-3">
            {!cfg.logoNegocio ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <WarningCircle size={16} weight="fill" className="mt-px shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-900">Te falta el logo</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
                    Sin logo, la tarjeta de tus clientes sale en blanco. Súbelo en{' '}
                    <strong>Configuración → Marca</strong> y todo lo demás se hace solo.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Confetti size={14} weight="fill" className="text-emerald-600" />
                  Tu tarjeta está lista
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                  Tus clientes ya pueden guardarla desde <strong>barber.pe/monedero</strong>, en
                  cualquier teléfono y sin instalar nada. El botón de{' '}
                  <strong>Google Wallet</strong> aparecerá solo cuando se activen las credenciales.
                </p>
              </div>
            )}

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400">
              <QrCode size={13} weight="fill" className="mt-px shrink-0 text-gray-300" />
              Tus clientes también entran solos al cobrarles: tras cada venta, la caja les
              ofrece guardar su tarjeta.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════ GUARDAR — barra flotante, siempre visible ══════════════ */}
      <div className="sticky bottom-0 z-30 flex justify-end gap-2 rounded-t-2xl border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <button
          onClick={guardar}
          disabled={guardando}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
        >
          {guardando ? <CircleNotch size={16} className="animate-spin" /> : <FloppyDisk size={16} weight="fill" />}
          Guardar programa
        </button>
      </div>

      {qrAbierto && (
        <QrInscripcionModal
          urlInscripcion={cfg.urlInscripcion ?? ''}
          nombreNegocio={cfg.nombreNegocio ?? 'Tu barbería'}
          logo={cfg.logoNegocio ?? null}
          color={colorMarca}
          onClose={() => setQrAbierto(false)}
        />
      )}
    </div>
  )
}

/* ── piezas pequeñas ──────────────────────────────────────────────────────── */

function Chip({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="truncate text-sm font-bold text-gray-900">{valor}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-gray-400">{etiqueta}</p>
    </div>
  )
}

function Fila({ etiqueta, valor, extra, fuerte }: {
  etiqueta: string; valor: string; extra?: string; fuerte?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <span className="text-xs text-gray-500">{etiqueta}</span>
      <span className={`text-right text-sm ${fuerte ? 'font-bold text-emerald-700' : 'font-medium text-gray-900'}`}>
        {valor}
        {extra && <span className="ml-1.5 text-[11px] font-normal text-amber-600">{extra}</span>}
      </span>
    </div>
  )
}

/**
 * T11 — Selector de icono de recompensa.
 *
 * Era un <select> de emojis. En Android eso abre la lista gris del sistema y los
 * emojis salen con la fuente del SO, no con la de la app — se ven distintos a los
 * de la propia lista. Aquí es una rejilla nuestra: lo que eliges es lo que ves.
 */
function IconoPicker({
  valor, onChange, opciones,
}: { valor?: string; onChange: (v: string) => void; opciones: string[] }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-label="Icono de la recompensa"
        className="grid h-9 w-14 place-items-center rounded-lg border border-gray-200 text-lg transition hover:border-gray-300"
      >
        {valor || '🎁'}
      </button>

      {abierto && (
        <>
          {/* Capa para cerrar al pulsar fuera. Sin ella, en móvil el popover se
              queda abierto y tapa el formulario. */}
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute left-0 top-11 z-20 w-max rounded-xl border border-gray-200 bg-white p-2.5 shadow-lg">
            <div className="grid grid-cols-6 gap-1.5">
              {opciones.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => { onChange(ic); setAbierto(false) }}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl leading-none transition ${
                    ic === valor ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-gray-100'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
