import { useState } from 'react'
import { SedeSwitcher } from '@/components/SedeSwitcher'
import { AccountMenu } from '@/components/AccountMenu'
import { MiPerfilAdminModal } from '@/components/MiPerfilAdminModal'
import { AccesoModal } from '@/components/AccesoModal'

/**
 * Header sticky reutilizable. Conserva el selector de sede ("mis sedes") y el
 * menú de cuenta, y monta los modales "Mi perfil" y "Acceso" del Admin (ambos
 * se abren desde el AccountMenu).
 *
 * Mantiene las props title/subtitle por compatibilidad (se ignoran).
 */
export function AdminHeader(_props: { title?: string; subtitle?: string }) {
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [accesoOpen, setAccesoOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-gray-100">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-end gap-2">
        <SedeSwitcher />
        <AccountMenu
          variant="plain"
          siteLink
          onMiPerfil={() => setPerfilOpen(true)}
          onAcceso={() => setAccesoOpen(true)}
        />
      </div>
      <MiPerfilAdminModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
      <AccesoModal open={accesoOpen} onClose={() => setAccesoOpen(false)} />
    </header>
  )
}
