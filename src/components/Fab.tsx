import { Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Botón flotante (FAB) reutilizable. Solo se muestra en móvil (md:hidden),
 * porque en escritorio las páginas ya tienen su botón "Nuevo ..." en la barra.
 *
 * Uso:
 *   <Fab onClick={() => navigate('/reservar-publica')} label="Añadir cita" />
 *   <Fab onClick={() => { resetForm(); setShowModal(true) }} label="Nuevo servicio" />
 */
export function Fab({
  onClick,
  label = 'Añadir',
  icon: Icon = Plus,
}: {
  onClick: () => void
  label?: string
  icon?: LucideIcon
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/40 active:scale-95 hover:bg-blue-700 transition"
      style={{ bottom: 'calc(78px + env(safe-area-inset-bottom))' }}
    >
      <Icon className="w-6 h-6" />
    </button>
  )
}
