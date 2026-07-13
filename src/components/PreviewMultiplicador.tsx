import { useMemo } from 'react'
import { Warning, ArrowRight } from '@phosphor-icons/react'

/**
 * T7 — VISTA PREVIA EN VIVO DEL MULTIPLICADOR.
 *
 * POR QUÉ EXISTE
 * --------------
 * Tras la T7 hay TRES multiplicadores que pueden estar activos sobre la misma venta,
 * y los configura gente distinta que no se ve entre sí:
 *
 *   1. Base de la MARCA   (el dueño)
 *   2. De la SEDE         (el encargado del local)
 *   3. Promoción vigente  (el encargado del local)
 *
 * Sin esta vista, nadie ve las tres capas a la vez. Alguien pone el aniversario de la
 * marca en x2, otro deja San Isidro en x2 desde una campaña vieja, y un tercero crea
 * "finde x3". Nadie quiso regalar nada. Y sin embargo, una venta de S/100 pasaría a dar
 * 1.200 puntos.
 *
 * Aquí se ve el cálculo entero antes de guardar, y se avisa cuando el tope lo recorta.
 *
 * LA REGLA (C+) — espejo exacto de Services/Fidelizacion/MultiplicadorPuntos.cs:
 *
 *     base  = multiplicadorSede ?? multiplicadorMarca     ← OVERRIDE, no MAX
 *     promo = la MEJOR promo vigente (o 1)                ← no el producto de todas
 *     final = MIN(base × promo, TOPE)
 *
 * Si una de las dos implementaciones cambia, la otra también. Son la misma regla.
 */

interface Props {
  /** ProgramaFidelizacion.MultiplicadorBase (la marca). */
  multiplicadorMarca: number
  /** El de ESTA sede. null/undefined = hereda el de la marca. */
  multiplicadorSede?: number | null
  /** La mejor promo vigente hoy en esta sede (1 o undefined = ninguna). */
  multiplicadorPromo?: number | null
  /** Nombre de esa promo, para nombrarla. */
  nombrePromo?: string | null
  /** ProgramaFidelizacion.MultiplicadorMaximo. */
  tope: number
  /** Cuántos soles = 1 punto. Para el ejemplo en soles. */
  solesPorPunto: number
  /** Venta de ejemplo. Default S/100 (es el caso con el que se razona). */
  ventaEjemplo?: number
}

const MIN = 1

/** Redondea a 2 decimales pero sin arrastrar ceros ("2.00" → "2"). */
const fmt = (n: number) => String(Math.round(n * 100) / 100)

export function PreviewMultiplicador({
  multiplicadorMarca,
  multiplicadorSede,
  multiplicadorPromo,
  nombrePromo,
  tope,
  solesPorPunto,
  ventaEjemplo = 100,
}: Props) {
  const calc = useMemo(() => {
    const piso = (v: number) => (v < MIN || !Number.isFinite(v) ? MIN : v)

    const marca = piso(Number(multiplicadorMarca))
    const sede =
      multiplicadorSede == null ? null : piso(Number(multiplicadorSede))
    const topeReal = tope >= MIN && Number.isFinite(tope) ? tope : 5

    // 1. Tasa PERMANENTE: la sede SOBRESCRIBE a la marca. No es un MAX — si lo fuera,
    //    una sede nunca podría BAJAR el multiplicador durante el aniversario de la marca.
    const base = sede ?? marca

    // 2. Capa TEMPORAL: la mejor promo. Si no hay, es neutra.
    const promo =
      multiplicadorPromo != null && Number(multiplicadorPromo) > MIN
        ? Number(multiplicadorPromo)
        : MIN

    // 3. Se multiplican las DOS capas (no las tres) y se topa.
    const bruto = base * promo
    const final = Math.min(bruto, topeReal)

    const spp = solesPorPunto > 0 ? solesPorPunto : 1
    const puntos = Math.floor((ventaEjemplo / spp) * final)

    return {
      marca,
      sede,
      base,
      promo,
      bruto,
      final,
      topado: bruto > topeReal,
      topeReal,
      puntos,
      sedeOverride: sede != null && sede !== marca,
    }
  }, [multiplicadorMarca, multiplicadorSede, multiplicadorPromo, tope, solesPorPunto, ventaEjemplo])

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Cómo queda en esta sede
      </p>

      {/* La cadena del cálculo, paso a paso. */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        <Chip
          etiqueta="Marca"
          valor={calc.marca}
          apagado={calc.sedeOverride}
          titulo={
            calc.sedeOverride
              ? 'Esta sede tiene su propio multiplicador, así que el de la marca no se aplica aquí.'
              : undefined
          }
        />

        {calc.sede != null && (
          <>
            <span className="text-gray-300">→</span>
            <Chip etiqueta="Sede" valor={calc.sede} destacado />
          </>
        )}

        {calc.promo > MIN && (
          <>
            <span className="font-semibold text-gray-400">×</span>
            <Chip etiqueta={nombrePromo || 'Promo'} valor={calc.promo} tono="promo" />
          </>
        )}

        <ArrowRight size={14} className="mx-0.5 text-gray-300" />

        <span
          className={`rounded-lg px-2 py-1 text-sm font-bold ${
            calc.topado
              ? 'bg-amber-100 text-amber-800'
              : 'bg-gray-900 text-white'
          }`}
        >
          x{fmt(calc.final)}
        </span>
      </div>

      {/* El ejemplo en dinero. Es lo que la gente entiende de verdad. */}
      <p className="mt-2.5 text-xs text-gray-500">
        Una venta de <strong className="text-gray-700">S/{ventaEjemplo}</strong> aquí daría{' '}
        <strong className="text-gray-900">{calc.puntos} puntos</strong>.
      </p>

      {/* El aviso del tope. Es EL motivo por el que existe esta vista. */}
      {calc.topado && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800">
          <Warning size={13} weight="fill" className="mt-px shrink-0" />
          <span>
            El cálculo daba <strong>x{fmt(calc.bruto)}</strong>, pero el tope de la marca lo
            recorta a <strong>x{calc.topeReal}</strong>. Si de verdad quieres dar más, sube el
            tope en <em>Programa de la marca</em>.
          </span>
        </p>
      )}

      {/* Que quede claro por qué el de la marca no aparece en la cuenta. */}
      {calc.sedeOverride && !calc.topado && (
        <p className="mt-1.5 text-[11px] text-gray-400">
          Esta sede usa su propio multiplicador (x{fmt(calc.sede!)}) en lugar del de la marca
          (x{fmt(calc.marca)}).
        </p>
      )}
    </div>
  )
}

function Chip({
  etiqueta,
  valor,
  destacado,
  apagado,
  tono,
  titulo,
}: {
  etiqueta: string
  valor: number
  destacado?: boolean
  apagado?: boolean
  tono?: 'promo'
  titulo?: string
}) {
  const clase = apagado
    ? 'bg-white text-gray-300 line-through border-gray-100'
    : tono === 'promo'
      ? 'bg-violet-50 text-violet-700 border-violet-100'
      : destacado
        ? 'bg-blue-50 text-blue-700 border-blue-100'
        : 'bg-white text-gray-600 border-gray-200'

  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${clase}`}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-70">{etiqueta}</span>
      <span className="text-xs font-bold">x{fmt(valor)}</span>
    </span>
  )
}

export default PreviewMultiplicador
