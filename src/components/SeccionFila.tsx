import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

type SeccionFilaProps = {
  /** Ícono (lucide), p. ej. <Clock className="w-[18px] h-[18px]" />. */
  icono: ReactNode
  titulo: string
  /** Resumen de lo configurado. Si está vacío y `estado='falta'`, se ve ámbar. */
  preview?: ReactNode
  estado?: 'listo' | 'falta'
  onClick: () => void
  /** Color del tile del ícono (hex). Por defecto azul. */
  color?: string
  /** Contenido opcional a la derecha del texto (p. ej. miniaturas de galería). */
  derecha?: ReactNode
}

/**
 * Fila del hub de Configuración: ícono + título + vista previa + chevron.
 * Toda la fila es tappable y abre el editor de esa sección.
 */
export default function SeccionFila({
  icono,
  titulo,
  preview,
  estado,
  onClick,
  color = '#2563EB',
  derecha,
}: SeccionFilaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-white hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0"
    >
      <span className="w-9 h-9 rounded-lg text-white flex items-center justify-center shrink-0" style={{ background: color }}>
        {icono}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-900">{titulo}</span>
        {preview != null && (
          <span className={`block text-xs truncate ${estado === 'falta' ? 'text-amber-600' : 'text-gray-400'}`}>
            {preview}
          </span>
        )}
      </span>
      {derecha}
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </button>
  )
}
