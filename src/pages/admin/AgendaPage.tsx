import { AdminLayout } from '@/components/AdminLayout'
import { AgendaBoard } from '@/components/AgendaBoard'

/**
 * Agenda del Admin = AdminLayout + AgendaBoard (modo admin).
 * Toda la lógica/markup de la agenda vive ahora en el componente reutilizable
 * AgendaBoard, que también usa el dashboard del Trabajador (modo trabajador).
 */
export function AgendaPage() {
  return (
    <AdminLayout title="Agenda" subtitle="Citas del día">
      <AgendaBoard mode="admin" />
    </AdminLayout>
  )
}
