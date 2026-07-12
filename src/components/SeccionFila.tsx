import type { ReactNode } from 'react'
import { CaretRight as ChevronRight } from '@phosphor-icons/react'

type SeccionFilaProps = {
  /** Ícono (lucide), p. ej. <Clock className="w-[18px] h-[18px]" />. */
  icono: ReactNode
  titulo: string
  /** Resumen de lo configurado. Si está vacío y `estado='falta'`, se ve ámbar. */
  preview?: ReactNode
  estado?: 'listo' | 'falta'
  onClick: () => void
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
  derecha,
}: SeccionFilaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-white hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0"
    >
      <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
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
