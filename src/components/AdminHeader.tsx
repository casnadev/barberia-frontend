import { useState } from 'react'
import { SedeSwitcher } from '@/components/SedeSwitcher'
import { AccountMenu } from '@/components/AccountMenu'
import { MiPerfilAdminModal } from '@/components/MiPerfilAdminModal'

/**
 * Header sticky reutilizable. Ya NO muestra título/subtítulo (el body de cada
 * página ya los trae, era redundante). Conserva el selector de sede
 * ("mis sedes") y el menú de cuenta, alineados a la derecha, y monta el modal
 * "Mi perfil" del Admin (se abre desde el AccountMenu).
 *
 * Mantiene las props title/subtitle por compatibilidad: las páginas que las
 * sigan pasando no se rompen, simplemente se ignoran.
 */
export function AdminHeader(_props: { title?: string; subtitle?: string }) {
  const [perfilOpen, setPerfilOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-end gap-2">
        <SedeSwitcher />
        <AccountMenu variant="plain" siteLink onMiPerfil={() => setPerfilOpen(true)} />
      </div>
      <MiPerfilAdminModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </header>
  )
}
