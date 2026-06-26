import { AgendaBoard } from '@/components/AgendaBoard'

/**
 * Agenda del Admin = AdminLayout + AgendaBoard (modo admin).
 * Toda la lógica/markup de la agenda vive ahora en el componente reutilizable
 * AgendaBoard, que también usa el dashboard del Trabajador (modo trabajador).
 */
export function AgendaPage() {
  return (
    <>
      <AgendaBoard mode="admin" />
    </>
  )
}
