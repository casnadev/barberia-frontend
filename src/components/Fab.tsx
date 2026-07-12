import type { ComponentType } from 'react'
import { Plus } from '@phosphor-icons/react'

/** Cualquier ícono que acepte className (Phosphor o lucide). Evita acoplar el
 *  Fab a una sola librería de íconos durante la migración a Phosphor. */
type IconoGenerico = ComponentType<{ className?: string }>

/**
 * Barra de acción flotante (solo móvil, md:hidden). Fija abajo, a todo el ancho,
 * con texto — mismo estilo que el botón "Menú". En escritorio las páginas usan su
 * propio botón arriba, por eso esta barra se oculta en md+.
 *
 * Uso:
 *   <Fab onClick={goReservar} label="Añadir cita" />
 *   <Fab onClick={() => setCobrar(true)} label="Venta rápida" icon={CurrencyDollar} color="green" />
 */
export function Fab({
  onClick,
  label = 'Añadir',
  icon: Icon = Plus,
  color = 'blue',
}: {
  onClick: () => void
  label?: string
  icon?: IconoGenerico
  color?: 'blue' | 'green'
}) {
  const cls = color === 'green' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
  return (
    <div
      className="md:hidden fixed left-0 right-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 pt-2.5"
      style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom))' }}
    >
      <button
        onClick={onClick}
        aria-label={label}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold active:scale-95 transition ${cls}`}
      >
        <Icon className="w-5 h-5" /> {label}
      </button>
    </div>
  )
}
