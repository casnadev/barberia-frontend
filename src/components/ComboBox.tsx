import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

/** Normaliza para comparar ignorando tildes y mayúsculas: "Áncash" ~ "ancash". */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/**
 * Una opción puede ser:
 *  - un string simple (ej. "Lima") → valor y etiqueta son el mismo texto, o
 *  - un objeto { valor, etiqueta } (ej. { valor: 7, etiqueta: "Sede Centro" })
 *    para menús basados en id (trabajadores, sedes, categorías…).
 */
export type ComboOpcion = string | { valor: string | number; etiqueta: string }

type Norm = { valor: string | number; etiqueta: string }
const aNorm = (o: ComboOpcion): Norm =>
  typeof o === 'string' ? { valor: o, etiqueta: o } : o

interface ComboBoxProps {
  /** Valor seleccionado (string para textos, number para ids, o '' / null si nada). */
  value: string | number | null | undefined
  /** Se llama con el `valor` de la opción elegida, o '' al limpiar. */
  onChange: (valor: string | number) => void
  /** Opciones: string[] o { valor, etiqueta }[]. */
  opciones: ComboOpcion[]
  placeholder?: string
  /** Deshabilitado (ej. Distrito antes de elegir Departamento). */
  disabled?: boolean
  /** Texto a mostrar cuando está deshabilitado. */
  textoDeshabilitado?: string
  /** Clases del input (para igualar al resto del formulario). */
  inputClassName?: string
}

/**
 * Buscador con autocompletado: el usuario escribe y la lista se filtra en vivo
 * (ignorando tildes). Reemplaza al <select> nativo, que en móvil abre una lista
 * enorme e incómoda. Solo permite elegir una opción de la lista (no texto libre).
 */
export function ComboBox({
  value,
  onChange,
  opciones,
  placeholder,
  disabled,
  textoDeshabilitado,
  inputClassName = '',
}: ComboBoxProps) {
  const items = useMemo(() => opciones.map(aNorm), [opciones])

  const etiquetaDe = (val: string | number | null | undefined): string => {
    if (val === '' || val == null) return ''
    const hit = items.find((i) => String(i.valor) === String(val))
    return hit ? hit.etiqueta : ''
  }
  const etiquetaActual = etiquetaDe(value)
  const tieneValor = value !== '' && value != null

  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState(etiquetaActual)
  const [activo, setActivo] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  // Reflejar el valor externo (ej. reset del distrito al cambiar de departamento).
  useEffect(() => { setTexto(etiquetaActual) }, [etiquetaActual])

  // Cerrar al hacer click fuera; descarta texto no confirmado.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
        setTexto(etiquetaActual)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [etiquetaActual])

  const filtradas = useMemo(() => {
    const q = norm(texto)
    if (!q || norm(etiquetaActual) === q) return items
    const empiezan: Norm[] = []
    const contienen: Norm[] = []
    for (const it of items) {
      const n = norm(it.etiqueta)
      if (n.startsWith(q)) empiezan.push(it)
      else if (n.includes(q)) contienen.push(it)
    }
    return [...empiezan, ...contienen]
  }, [items, texto, etiquetaActual])

  // Mantener visible la opción activa al navegar con el teclado.
  useEffect(() => {
    if (!abierto || !listaRef.current) return
    const el = listaRef.current.children[activo] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activo, abierto])

  const elegir = (it: Norm) => { onChange(it.valor); setTexto(it.etiqueta); setAbierto(false) }
  const limpiar = () => { onChange(''); setTexto(''); setAbierto(true); inputRef.current?.focus() }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-autocomplete="list"
          autoComplete="off"
          className={inputClassName + ' pr-9'}
          value={texto}
          disabled={disabled}
          placeholder={disabled ? (textoDeshabilitado || placeholder) : placeholder}
          onFocus={() => { if (!disabled) { setAbierto(true); setActivo(0); inputRef.current?.select() } }}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((i) => Math.min(i + 1, filtradas.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter') { if (abierto && filtradas[activo]) { e.preventDefault(); elegir(filtradas[activo]) } }
            else if (e.key === 'Escape') { setAbierto(false); setTexto(etiquetaActual) }
          }}
        />
        {tieneValor && !disabled ? (
          <button
            type="button"
            onClick={limpiar}
            aria-label="Limpiar"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        )}
      </div>

      {abierto && !disabled && (
        <ul
          ref={listaRef}
          className="absolute z-40 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1"
        >
          {filtradas.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
          ) : (
            filtradas.map((it, i) => (
              <li
                key={String(it.valor)}
                onMouseEnter={() => setActivo(i)}
                onMouseDown={(e) => { e.preventDefault(); elegir(it) }}
                className={`px-3 py-2 text-sm flex items-center justify-between cursor-pointer ${
                  i === activo ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span>{it.etiqueta}</span>
                {String(it.valor) === String(value) && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
