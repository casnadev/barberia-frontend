import { useState, useEffect, useTransition, useCallback, useContext, createContext, Suspense } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { Home, Scissors, Users, Calendar, User, Clock, Settings, Wallet, Calculator, BadgeCheck, DollarSign } from 'lucide-react'
import { AdminHeader } from '@/components/AdminHeader'
import { CobrarVentaModal } from '@/components/CobrarVentaModal'
import { prefetchAdminPages } from '@/router/adminPages'
import s from '@/styles/AdminLayout.module.css'

/**
 * AdminShell — LAYOUT PERSISTENTE del panel admin.
 *
 * Se monta UNA sola vez (es el `element` de la ruta padre en App.tsx) y NO se
 * desmonta mientras el admin navega entre Dashboard, Clientes, Agenda, etc.
 * Las páginas se renderizan en el <Outlet/>; solo cambia el contenido, nunca
 * el riel lateral, el header (SedeSwitcher + AccountMenu), el footer móvil ni
 * el FAB de "Venta rápida". Eso elimina el parpadeo/reconstrucción visual.
 *
 * NAVEGACIÓN CON useTransition
 * ────────────────────────────
 * Los enlaces del riel y del footer NO navegan de forma síncrona: envuelven el
 * cambio de ruta en `startTransition`. Mientras el chunk/markup de la nueva
 * página se prepara, React MANTIENE la página anterior en pantalla en lugar de
 * mostrar el fallback de <Suspense>. Solo cuando la nueva está lista, hace el
 * swap. Durante ese lapso `isPending` es true y mostramos una barra de progreso
 * superior fina (estilo Vercel/Linear), sin sustituir el contenido.
 *
 * Con el prefetch de chunks, casi todas las navegaciones son instantáneas; la
 * transición actúa como red de seguridad para la primera visita a cada sección.
 */

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
  .map((to) => NAV.find((n) => n.to === to))
  .filter((n): n is NavItem => Boolean(n))

// ─────────────────────────────────────────────────────────────────────────────
// Contexto de navegación con transición. AdminShell provee `navTo`; los enlaces
// lo consumen. Se define a nivel de módulo para que <TNavLink> no se recree en
// cada render (evita remontajes innecesarios).
// ─────────────────────────────────────────────────────────────────────────────
const NavCtx = createContext<(to: string) => void>(() => {})

type TNavLinkProps = {
  to: string
  end?: boolean
  className: (active: boolean) => string
  children: React.ReactNode
}

/**
 * Enlace de navegación con transición. Es un <a> real (mantiene href para
 * accesibilidad, "abrir en pestaña nueva", hover de URL, etc.), pero en el clic
 * izquierdo simple intercepta y navega vía startTransition. Con modificadores
 * (Ctrl/Cmd/Shift/Alt) o clic medio deja que el navegador abra normalmente.
 */
function TNavLink({ to, end, className, children }: TNavLinkProps) {
  const location = useLocation()
  const navTo = useContext(NavCtx)
  const active = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(to + '/')

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navTo(to)
  }

  return (
    <a href={to} onClick={onClick} className={className(active)} aria-current={active ? 'page' : undefined}>
      {children}
    </a>
  )
}

/** Fallback discreto, confinado al área de contenido (no a pantalla completa). */
function ContentFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2855F6', borderRadius: '50%', animation: 'appspin .8s linear infinite' }} />
    </div>
  )
}

/** Barra de progreso superior (indeterminada). Solo se monta mientras isPending. */
function TopProgressBar() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 60,
        overflow: 'hidden', background: 'rgba(40,85,246,0.12)', pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%', width: '40%', borderRadius: 3,
          background: 'linear-gradient(90deg, #2855F6, #2092B4)',
          animation: 'adminNavProg 0.9s ease-in-out infinite',
        }}
      />
    </div>
  )
}

export function AdminShell() {
  const [cobrar, setCobrar] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [isPending, startTransition] = useTransition()

  // Navegación no bloqueante: mantiene el contenido anterior hasta que el nuevo
  // está listo. Ignora navegar a la ruta en la que ya estamos.
  const navTo = useCallback(
    (to: string) => {
      if (to === location.pathname) return
      startTransition(() => navigate(to))
    },
    [navigate, location.pathname],
  )

  // Calienta los chunks de todas las páginas admin en cuanto el shell monta.
  useEffect(() => {
    prefetchAdminPages()
  }, [])

  return (
    <NavCtx.Provider value={navTo}>
      {/* Keyframe local de la barra de progreso (evita tocar el CSS global). */}
      <style>{`@keyframes adminNavProg{0%{transform:translateX(-120%)}50%{transform:translateX(60%)}100%{transform:translateX(260%)}}`}</style>

      {isPending && <TopProgressBar />}

      <div className={s.shell}>
        {/* Riel lateral (desktop) — PERSISTENTE */}
        <aside className={s.rail}>
          <nav className={s.railNav}>
            {NAV.map((n) => (
              <TNavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={(active) => `${s.railItem} ${active ? s.railItemActive : ''}`}
              >
                <n.icon width={20} height={20} />
                <span className={s.railLabel}>{n.label}</span>
              </TNavLink>
            ))}
          </nav>
        </aside>

        {/* Columna principal */}
        <div className={s.main}>
          {/* Header PERSISTENTE: SedeSwitcher + AccountMenu nunca se desmontan */}
          <AdminHeader />
          <main className={s.content}>
            {/* Solo el contenido (la página activa) se suspende/cambia */}
            <Suspense fallback={<ContentFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        {/* Footer (mobile): carrusel deslizable — PERSISTENTE */}
        <nav className={s.bottomBar}>
          <div className={s.bottomScroll}>
            {footerItems.map((n) => (
              <TNavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={(active) => `${s.bottomItem} ${active ? s.bottomItemActive : ''}`}
              >
                <n.icon width={20} height={20} />
                <span>{n.label}</span>
              </TNavLink>
            ))}
          </div>
        </nav>

        {/* Venta rápida (walk-in) — FAB en móvil, botón en desktop. PERSISTENTE. */}
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
    </NavCtx.Provider>
  )
}
