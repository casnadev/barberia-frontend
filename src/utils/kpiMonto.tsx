import type { ReactNode } from 'react'

/**
 * Renderiza un monto "S/ X.XX" con el prefijo "S/" más pequeño y tenue,
 * para que el número sea el héroe visual de la card. Si el valor no es
 * una moneda (p. ej. un conteo "0"), lo devuelve tal cual.
 */
export function montoFmt(value: string, curClassName?: string): ReactNode {
  if (typeof value === 'string' && value.trim().startsWith('S/')) {
    const resto = value.trim().slice(2).trim()
    return (
      <>
        <span className={curClassName}>S/</span>
        {resto}
      </>
    )
  }
  return value
}
