import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Check } from '@phosphor-icons/react'

const hhmm = (v?: string) => (v || '').slice(0, 5)
const aMin = (v: string) => { const [h, m] = v.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const aStr = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/**
 * Selector de hora reutilizable (sede y trabajador). Reemplaza al <input type="time">
 * nativo por un menú propio, consistente en todos los navegadores y móvil, con
 * incrementos configurables (15/30 min). Respeta min/max y NUNCA pierde el valor
 * actual aunque no caiga en el incremento (p. ej. 23:50 se conserva y es elegible).
 */
export function TimePicker({
  value,
  onChange,
  min,
  max,
  step = 15,
  disabled,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  step?: number
  disabled?: boolean
  ariaLabel?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const val = hhmm(value)

  const opciones = useMemo(() => {
    const lo = min ? aMin(hhmm(min)) : 0
    const hi = max ? aMin(hhmm(max)) : 24 * 60 - 1
    const set = new Set<number>()
    for (let m = lo; m <= hi; m += step) set.add(m)
    // Conserva el valor actual y los límites aunque no caigan en el incremento.
    if (val) { const v = aMin(val); if (v >= lo && v <= hi) set.add(v) }
    set.add(lo); set.add(hi)
    return Array.from(set).sort((a, b) => a - b).map(aStr)
  }, [min, max, step, val])

  useEffect(() => {
    if (!abierto) return
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', onDoc)
    // Centra el valor seleccionado al abrir.
    const t = setTimeout(() => {
      const el = listRef.current?.querySelector('[data-sel="1"]') as HTMLElement | null
      el?.scrollIntoView({ block: 'center' })
    }, 0)
    return () => { document.removeEventListener('mousedown', onDoc); clearTimeout(t) }
  }, [abierto])

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || 'Seleccionar hora'}
        onClick={() => !disabled && setAbierto((o) => !o)}
        className={`inline-flex items-center gap-1.5 min-w-[76px] justify-center px-3 py-2 rounded-lg border text-sm tabular-nums transition
          ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            : abierto ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20'
            : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300'}`}
      >
        {val || '--:--'}
        <Clock className="w-3.5 h-3.5 opacity-60" />
      </button>

      {abierto && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-40 mt-1 w-28 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1"
          style={{ left: 0 }}
        >
          {opciones.map((op) => {
            const sel = op === val
            return (
              <button
                key={op}
                type="button"
                data-sel={sel ? '1' : '0'}
                role="option"
                aria-selected={sel}
                onClick={() => { onChange(op); setAbierto(false) }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm tabular-nums text-left transition
                  ${sel ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800 hover:bg-gray-50'}`}
              >
                {op}
                {sel && <Check className="w-3.5 h-3.5" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Duración legible entre dos horas "HH:mm" → "8h 30m" / "12h" / "45m". */
export function duracionHoras(inicio?: string, fin?: string): string {
  if (!inicio || !fin) return ''
  const d = aMin(hhmm(fin)) - aMin(hhmm(inicio))
  if (d <= 0) return ''
  const h = Math.floor(d / 60), m = d % 60
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`
}
