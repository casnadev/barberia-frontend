import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Scissors, Users, Calendar, User, Clock, Settings, Wallet, Calculator, BadgeCheck, DollarSign } from 'lucide-react'
import { AdminHeader } from '@/components/AdminHeader'
import { CobrarVentaModal } from '@/components/CobrarVentaModal'
import s from '@/styles/AdminLayout.module.css'

type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean }

/* Secciones del admin (orden del riel lateral en desktop) */
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: Home, end: true },
  { to: '/admin/servicios', label: 'Servicios', icon: Scissors },
  { to: '/admin/trabajadores', label: 'Equipo', icon: Users },
  { to: '/admin/agenda', label: 'Agenda', icon: Calendar },
  { to: '/admin/clientes', label: 'Clientes', icon: User },
  { to: '/admin/reservas', label: 'Reservas', icon: Clock },
  { to: '/admin/ventas', label: 'Ventas', icon: BadgeCheck },
  { to: '/admin/pagos', label: 'Pagos', icon: Wallet },
  { to: '/admin/caja', label: 'Caja', icon: Calculator },
  { to: '/admin/configuracion', label: 'Config', icon: Settings },
]

/* Footer (mobile): carrusel deslizable con peek. NO incluye Config (vive en el
   Account Menu). Orden: las 4 principales primero, luego las secundarias que se
   ven deslizando ←. */
const FOOTER_TOS = ['/dashboard', '/admin/agenda', '/admin/reservas', '/admin/ventas', '/admin/clientes', '/admin/servicios', '/admin/trabajadores']
const footerItems = FOOTER_TOS
  .map(to => NAV.find(n => n.to === to))
  .filter((n): n is NavItem => Boolean(n))

export function AdminLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [cobrar, setCobrar] = useState(false)
  return (
    <div className={s.shell}>
      {/* Riel lateral (desktop) */}
      <aside className={s.rail}>
        <nav className={s.railNav}>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `${s.railItem} ${isActive ? s.railItemActive : ''}`}
            >
              <n.icon width={20} height={20} />
              <span className={s.railLabel}>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Columna principal */}
      <div className={s.main}>
        <AdminHeader title={title} subtitle={subtitle} />
        <main className={s.content}>{children}</main>
      </div>

      {/* Footer (mobile): carrusel deslizable */}
      <nav className={s.bottomBar}>
        <div className={s.bottomScroll}>
          {footerItems.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `${s.bottomItem} ${isActive ? s.bottomItemActive : ''}`}
            >
              <n.icon width={20} height={20} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Venta rápida (walk-in) — FAB en móvil (apilada ARRIBA del botón Reservar de
          la agenda, a 150px), botón en desktop. Disponible en todo el admin. */}
      <button
        onClick={() => setCobrar(true)}
        aria-label="Venta rápida"
        className="fixed right-4 md:right-6 bottom-[calc(150px+env(safe-area-inset-bottom))] md:bottom-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full md:rounded-2xl shadow-xl shadow-emerald-600/40 active:scale-95 transition flex items-center justify-center gap-2 w-14 h-14 md:w-auto md:h-auto md:px-5 md:py-3"
      >
        <DollarSign className="w-6 h-6 md:w-5 md:h-5" />
        <span className="hidden md:inline font-semibold">Venta rápida</span>
      </button>

      {cobrar && <CobrarVentaModal mode="admin" onClose={() => setCobrar(false)} onDone={() => setCobrar(false)} />}
    </div>
  )
}
