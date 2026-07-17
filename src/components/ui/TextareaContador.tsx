import { useId } from 'react'

/**
 * Textarea con contador de caracteres y límite DURO.
 *
 * El problema que resuelve (Tarea 2a): los campos de descripción tenían el límite
 * solo en el backend. El usuario escribía de más y recién al guardar recibía un
 * error técnico en inglés ("The field Descripcion must be a string with a maximum
 * length of 400."). Ahora:
 *   • No puede pasarse: `maxLength` corta la escritura en el límite.
 *   • Sabe cuánto le queda: contador "380 / 400" que se pone ámbar al acercarse
 *     y rojo si (por datos viejos) ya venía excedido.
 *
 * Es el MISMO componente para todos los campos de descripción/notas de la app, así
 * el comportamiento es idéntico en cada lugar. Reemplaza `<textarea>` suelto.
 *
 * Uso:
 *   <TextareaContador value={desc} onChange={setDesc} limite={400} rows={3} />
 */
export function TextareaContador({
  value,
  onChange,
  limite = 400,
  rows = 3,
  placeholder,
  className,
  label,
  id,
  disabled,
  required,
}: {
  value: string
  onChange: (v: string) => void
  limite?: number
  rows?: number
  placeholder?: string
  /** Clase del textarea. Si no se pasa, usa el estilo estándar de la app. */
  className?: string
  /** Etiqueta opcional; si se pasa se renderiza arriba, ligada por htmlFor. */
  label?: string
  id?: string
  disabled?: boolean
  required?: boolean
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  const usados = value?.length ?? 0
  const restantes = limite - usados

  // Umbral de aviso: últimos 40 o el 10% del límite, lo que sea mayor.
  const umbral = Math.max(40, Math.round(limite * 0.1))
  const excedido = restantes < 0
  const cerca = !excedido && restantes <= umbral

  const colorContador = excedido
    ? 'text-red-500'
    : cerca
      ? 'text-amber-500'
      : 'text-gray-400'

  const base =
    'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y'

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        value={value}
        // maxLength = límite duro: no deja escribir de más. Sigue siendo la primera
        // línea de defensa; el backend valida igual por si acaso.
        maxLength={limite}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={className ?? base}
        aria-describedby={`${inputId}-contador`}
      />
      <div id={`${inputId}-contador`} className={`mt-1 text-right text-[11px] font-medium ${colorContador}`}>
        {usados} / {limite}
      </div>
    </div>
  )
}
