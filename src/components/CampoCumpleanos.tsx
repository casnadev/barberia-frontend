import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * CampoCumpleanos — entrada de fecha de nacimiento TECLEABLE (DD/MM/AAAA).
 *
 * PROBLEMA QUE RESUELVE
 * ---------------------
 * Antes esto era un <input type="date">. En Android eso abre el date-picker nativo,
 * que arranca en el MES ACTUAL: para llegar a agosto de 1987 hay que pulsar la
 * flecha "mes anterior" unas 460 veces. En la práctica, nadie rellenaba el campo.
 *
 * Aquí se teclea: "13081987" → "13/08/1987". La máscara y el auto-avance los pone
 * el componente; el usuario solo escribe números.
 *
 * NO se usa <input type="date"> ni un calendario. Una fecha de nacimiento no se
 * "busca" en un calendario: se sabe de memoria y se escribe.
 *
 * Emite `onChange` en formato ISO (AAAA-MM-DD) — que es lo que espera el backend
 * (DateOnly?) — o '' si la fecha está incompleta o no es válida.
 */

interface Props {
  /** Valor en ISO (AAAA-MM-DD) o ''. */
  value: string
  onChange: (isoOVacio: string) => void
  className?: string
  id?: string
  /** Edad mínima. Default 13 (habitual para tratamiento de datos de menores). */
  edadMinima?: number
  /** Edad máxima razonable, para atrapar años tecleados mal (ej. 1087). */
  edadMaxima?: number
}

/** Días reales del mes: atrapa 31/02, 31/04, y los bisiestos de verdad. */
const diasDelMes = (mes: number, anio: number): number =>
  new Date(anio, mes, 0).getDate()

const soloDigitos = (s: string) => s.replace(/\D/g, '')

/** "13081987" → "13/08/1987"; "1308" → "13/08"; "1" → "1" */
const enmascarar = (digitos: string): string => {
  const d = digitos.slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** ISO (AAAA-MM-DD) → "DD/MM/AAAA". Vacío si no parsea. */
const isoATexto = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

export function CampoCumpleanos({
  value,
  onChange,
  className,
  id,
  edadMinima = 13,
  edadMaxima = 100,
}: Props) {
  const [texto, setTexto] = useState(() => isoATexto(value))
  const [error, setError] = useState<string | null>(null)
  const editando = useRef(false)

  // Si el valor cambia DESDE FUERA (reset del formulario, carga de datos), se
  // refleja. Pero no mientras el usuario escribe: eso le pisaría el cursor.
  useEffect(() => {
    if (!editando.current) setTexto(isoATexto(value))
  }, [value])

  const anioActual = new Date().getFullYear()
  const anioMin = anioActual - edadMaxima
  const anioMax = anioActual - edadMinima

  /**
   * Valida y traduce a ISO. Devuelve [iso, error].
   * Un campo vacío es VÁLIDO: el cumpleaños es opcional.
   */
  const validar = (t: string): [string, string | null] => {
    const d = soloDigitos(t)
    if (d.length === 0) return ['', null]
    if (d.length < 8) return ['', 'Completa la fecha (DD/MM/AAAA).']

    const dia = Number(d.slice(0, 2))
    const mes = Number(d.slice(2, 4))
    const anio = Number(d.slice(4, 8))

    if (mes < 1 || mes > 12) return ['', 'Ese mes no existe.']
    if (anio < anioMin || anio > anioMax) {
      return ['', `El año debe estar entre ${anioMin} y ${anioMax}.`]
    }
    // Se valida el día DESPUÉS del mes y el año, porque febrero depende de ambos.
    if (dia < 1 || dia > diasDelMes(mes, anio)) return ['', 'Ese día no existe en ese mes.']

    const iso = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

    // Fecha futura: imposible como cumpleaños. (El rango de años ya lo cubre casi
    // todo, pero un 31/12 del año límite podría colarse.)
    if (new Date(iso) > new Date()) return ['', 'Esa fecha aún no ha llegado.']

    return [iso, null]
  }

  const manejarCambio = (bruto: string) => {
    editando.current = true

    const enmascarado = enmascarar(soloDigitos(bruto))
    setTexto(enmascarado)

    const [iso, err] = validar(enmascarado)

    // El error solo se muestra cuando la fecha está COMPLETA. Mientras teclea
    // "13/0" no tiene sentido gritarle que el mes no existe.
    setError(soloDigitos(enmascarado).length === 8 ? err : null)

    onChange(iso)
    editando.current = false
  }

  const describir = useMemo(() => {
    const [iso] = validar(texto)
    if (!iso) return null
    const edad = anioActual - Number(iso.slice(0, 4))
    return `${edad} años`
  }, [texto, anioActual])

  return (
    <div>
      <input
        id={id}
        className={className}
        // inputMode numérico: en móvil abre el teclado de números directamente.
        // type="text" (NO "date"): queremos teclear, no navegar un calendario.
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        value={texto}
        onChange={(e) => manejarCambio(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id ?? 'cumple'}-err` : undefined}
      />

      {error ? (
        <p id={`${id ?? 'cumple'}-err`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : describir ? (
        <p className="mt-1 text-xs text-gray-400">{describir}</p>
      ) : null}
    </div>
  )
}

export default CampoCumpleanos
