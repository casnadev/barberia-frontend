import type { ReactNode } from 'react'
import { Check as CheckIcon } from '@phosphor-icons/react'

/**
 * T11 — CONTROLES DE SELECCIÓN.
 *
 * Tres piezas que sustituyen a los checkboxes y <select> nativos:
 *
 *   Check      — el cuadrado verde relleno.
 *   CheckPill  — Check + etiqueta, como pastilla clicable ("Destacado", "Activo").
 *   OptionGroup— rejilla de botones-radio (método de pago, tipo de novedad…).
 *
 * POR QUÉ NO EL <input type="checkbox"> DEL SISTEMA
 * -------------------------------------------------
 * Porque cada navegador lo pinta distinto, y en Android sale el azul de Material
 * — que no es tu marca. Aquí el input real sigue existiendo (accesibilidad, teclado,
 * lectores de pantalla) pero está oculto con `sr-only`: lo que se ve es nuestro.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Check — el cuadrado verde
// ═══════════════════════════════════════════════════════════════════════════
export function Check({ marcado, size = 16 }: { marcado: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-[5px] border transition-colors ${
        marcado
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-gray-300 bg-white text-transparent'
      }`}
    >
      <CheckIcon size={size * 0.68} weight="bold" />
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CheckPill — "Destacado" / "Activo"
// ═══════════════════════════════════════════════════════════════════════════
export function CheckPill({
  marcado, onChange, children, disabled, className = '',
}: {
  marcado: boolean
  onChange: (v: boolean) => void
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition ${
        marcado
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
    >
      {/* El input REAL sigue ahí: tabulación, espacio, lectores de pantalla.
          Solo está oculto visualmente. */}
      <input
        type="checkbox"
        className="sr-only"
        checked={marcado}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Check marcado={marcado} size={15} />
      <span className={`text-xs font-medium ${marcado ? 'text-emerald-800' : 'text-gray-600'}`}>
        {children}
      </span>
    </label>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// OptionGroup — rejilla de botones-radio
// ═══════════════════════════════════════════════════════════════════════════
export interface Opcion<T extends string> {
  valor: T
  etiqueta: string
  /** Icono opcional (Phosphor). */
  icono?: ReactNode
  /** Descripción de una línea, bajo la etiqueta. */
  nota?: string
  disabled?: boolean
  /** Motivo por el que está deshabilitada (tooltip). */
  motivoDisabled?: string
}

/**
 * Sustituye a un <select> cuando las opciones son POCAS y VISIBLES DE UN VISTAZO
 * (≤6). Con más, un ComboBox es mejor: una rejilla de 12 botones no es un atajo,
 * es un muro.
 *
 * `cols` fija las columnas. En móvil nunca más de 3: por debajo, los textos se
 * cortan y dejas de saber qué estás pulsando.
 */
export function OptionGroup<T extends string>({
  valor, onChange, opciones, cols = 3, label,
}: {
  valor: T
  onChange: (v: T) => void
  opciones: Opcion<T>[]
  cols?: 2 | 3 | 4
  label?: string
}) {
  const grid = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[cols]

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-gray-500">{label}</label>
      )}
      <div className={`grid ${grid} gap-1.5`} role="radiogroup" aria-label={label}>
        {opciones.map((o) => {
          const activo = o.valor === valor
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              disabled={o.disabled}
              title={o.disabled ? o.motivoDisabled : undefined}
              onClick={() => !o.disabled && onChange(o.valor)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-2 transition ${
                activo
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${o.disabled ? 'cursor-not-allowed opacity-45' : ''}`}
            >
              {o.icono && (
                <span className={activo ? 'text-emerald-700' : 'text-gray-400'}>{o.icono}</span>
              )}
              <span
                className={`text-[11px] leading-tight ${
                  activo ? 'font-semibold text-emerald-800' : 'text-gray-600'
                }`}
              >
                {o.etiqueta}
              </span>
              {o.nota && (
                <span className="text-[10px] leading-tight text-gray-400">{o.nota}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// InputAfijo — "S/ [55]" y "[60] min"
// ═══════════════════════════════════════════════════════════════════════════
/**
 * El usuario escribe SOLO el número. El "S/" y el "min" son parte de la caja, no
 * texto que haya que teclear ni adivinar.
 *
 * Antes el campo decía "Precio (S/)" y el usuario escribía "55" (bien) o "S/ 55"
 * (y entonces el parse fallaba). La unidad pintada dentro de la caja quita esa
 * duda de raíz.
 */
export function InputAfijo({
  valor, onChange, prefijo, sufijo, placeholder, id,
}: {
  valor: string | number
  onChange: (v: string) => void
  prefijo?: string
  sufijo?: string
  placeholder?: string
  id?: string
}) {
  return (
    <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white transition focus-within:border-gray-400">
      {prefijo && (
        <span className="grid select-none place-items-center bg-gray-50 px-2.5 text-sm text-gray-400">
          {prefijo}
        </span>
      )}
      <input
        id={id}
        // inputMode numérico: teclado de números en móvil. type="text" y no
        // type="number" a propósito — number trae flechitas, permite "e" y "+",
        // y en algunos Android abre un teclado con caracteres que no queremos.
        type="text"
        inputMode="decimal"
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        className="w-full min-w-0 border-0 bg-transparent px-2.5 text-sm outline-none"
      />
      {sufijo && (
        <span className="grid select-none place-items-center bg-gray-50 px-2.5 text-sm text-gray-400">
          {sufijo}
        </span>
      )}
    </div>
  )
}
