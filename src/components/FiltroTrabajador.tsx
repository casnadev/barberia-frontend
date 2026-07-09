import { buildImageUrl } from '@/services/apiClient'
import { User } from 'lucide-react'

export interface TrabajadorFiltro {
  idTrabajador: number
  nombreCompleto: string
  urlFotoPerfil?: string | null
}

/**
 * Barra de filtro por trabajador — uniforme para Ventas, Pagos y Reservas.
 * Chips horizontales con foto + nombre; el primer chip es "Todos".
 *
 * `value = null` significa "Todos". El componente es solo presentación: el
 * padre decide si filtra en cliente o en servidor a partir de `onChange`.
 */
export function FiltroTrabajador({
  trabajadores,
  value,
  onChange,
  className = '',
}: {
  trabajadores: TrabajadorFiltro[]
  value: number | null
  onChange: (idTrabajador: number | null) => void
  className?: string
}) {
  if (!trabajadores || trabajadores.length === 0) return null

  const chip = (activo: boolean) =>
    `shrink-0 inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-sm font-medium transition ${
      activo
        ? 'bg-gray-900 border-gray-900 text-white'
        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
    }`

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      {/* Todos */}
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm font-medium transition ${
          value === null
            ? 'bg-gray-900 border-gray-900 text-white'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        <User className="w-3.5 h-3.5" /> Todos
      </button>

      {trabajadores.map((t) => {
        const activo = value === t.idTrabajador
        const src = t.urlFotoPerfil ? buildImageUrl(t.urlFotoPerfil) : ''
        return (
          <button
            key={t.idTrabajador}
            type="button"
            onClick={() => onChange(activo ? null : t.idTrabajador)}
            className={chip(activo)}
            title={t.nombreCompleto}
          >
            {src ? (
              <img src={src} alt={t.nombreCompleto} className="w-6 h-6 rounded-full object-cover bg-gray-100" />
            ) : (
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  activo ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                <User className="w-3.5 h-3.5" />
              </span>
            )}
            <span className="whitespace-nowrap max-w-[9rem] truncate">
              {t.nombreCompleto.split(' ')[0]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
